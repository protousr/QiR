let Templates = [];
let Servers = [];
let ActiveConsoleServerId = null;
let ConsoleSocket = null;
let StatsSocket = null;
let CurrentAuthToken = null;
let CurrentUser = null;
let PollingIntervals = [];

const Elements = {
  AuthOverlay: document.getElementById("AuthOverlay"),
  AuthTitle: document.getElementById("AuthTitle"),
  AuthSubtitle: document.getElementById("AuthSubtitle"),
  AuthErrorAlert: document.getElementById("AuthErrorAlert"),
  LoginForm: document.getElementById("LoginForm"),
  LoginUsername: document.getElementById("LoginUsername"),
  LoginPassword: document.getElementById("LoginPassword"),
  LoginSubmitBtn: document.getElementById("LoginSubmitBtn"),
  SetupForm: document.getElementById("SetupForm"),
  SetupUsername: document.getElementById("SetupUsername"),
  SetupPassword: document.getElementById("SetupPassword"),
  SetupConfirmPassword: document.getElementById("SetupConfirmPassword"),
  SetupSubmitBtn: document.getElementById("SetupSubmitBtn"),
  AppWrapper: document.getElementById("AppWrapper"),
  CurrentUsernameText: document.getElementById("CurrentUsernameText"),
  LogoutButton: document.getElementById("LogoutButton"),
  NavServers: document.getElementById("NavServers"),
  NavTemplates: document.getElementById("NavTemplates"),
  NavSystem: document.getElementById("NavSystem"),
  NavServersBadge: document.getElementById("NavServersBadge"),
  NavTemplatesBadge: document.getElementById("NavTemplatesBadge"),
  SectionServers: document.getElementById("SectionServers"),
  SectionTemplates: document.getElementById("SectionTemplates"),
  SectionSystem: document.getElementById("SectionSystem"),
  PageTitle: document.getElementById("PageTitle"),
  DockerStatusBadge: document.getElementById("DockerStatusBadge"),
  DockerSocketText: document.getElementById("DockerSocketText"),
  HostPlatformSidebar: document.getElementById("HostPlatformSidebar"),
  TotalContainersCount: document.getElementById("TotalContainersCount"),
  RunningContainersCount: document.getElementById("RunningContainersCount"),
  StoppedContainersCount: document.getElementById("StoppedContainersCount"),
  TemplatesAvailableCount: document.getElementById("TemplatesAvailableCount"),
  SearchServersInput: document.getElementById("SearchServersInput"),
  ServersTableBody: document.getElementById("ServersTableBody"),
  TemplatesGrid: document.getElementById("TemplatesGrid"),
  HostInfoTableBody: document.getElementById("HostInfoTableBody"),
  DockerDiagTableBody: document.getElementById("DockerDiagTableBody"),
  RefreshButton: document.getElementById("RefreshButton"),
  OpenDeployModalButton: document.getElementById("OpenDeployModalButton"),
  DeployModal: document.getElementById("DeployModal"),
  DeployServerForm: document.getElementById("DeployServerForm"),
  DeployNameInput: document.getElementById("DeployNameInput"),
  DeployTemplateSelect: document.getElementById("DeployTemplateSelect"),
  DeployTemplateDescAlert: document.getElementById("DeployTemplateDescAlert"),
  DeployDynamicFields: document.getElementById("DeployDynamicFields"),
  DeployHostPortInput: document.getElementById("DeployHostPortInput"),
  DeployAutoRestartInput: document.getElementById("DeployAutoRestartInput"),
  ConsoleModal: document.getElementById("ConsoleModal"),
  ConsoleInstanceTitle: document.getElementById("ConsoleInstanceTitle"),
  ConsoleStatusBadge: document.getElementById("ConsoleStatusBadge"),
  ConsoleCpuMetric: document.getElementById("ConsoleCpuMetric"),
  ConsoleRamMetric: document.getElementById("ConsoleRamMetric"),
  ConsoleTerminal: document.getElementById("ConsoleTerminal"),
  ConsoleCommandForm: document.getElementById("ConsoleCommandForm"),
  ConsoleCommandInput: document.getElementById("ConsoleCommandInput"),
};

function GetBootstrapModal(element) {
  if (typeof window !== "undefined" && window.bootstrap && window.bootstrap.Modal) {
    return window.bootstrap.Modal.getOrCreateInstance(element);
  }
  return null;
}

function ShowAuthError(message) {
  Elements.AuthErrorAlert.classList.remove("d-none");
  Elements.AuthErrorAlert.textContent = message;
}

function HideAuthError() {
  Elements.AuthErrorAlert.classList.add("d-none");
  Elements.AuthErrorAlert.textContent = "";
}

async function CheckAuthentication() {
  try {
    const setupRes = await fetch("/api/auth/setup-status");
    const setupJson = await setupRes.json();

    if (setupJson.Success && setupJson.Data.SetupRequired) {
      Elements.AuthOverlay.style.display = "flex";
      Elements.AppWrapper.style.setProperty("display", "none", "important");
      Elements.LoginForm.classList.add("d-none");
      Elements.SetupForm.classList.remove("d-none");
      Elements.AuthTitle.textContent = "Initialize Master Admin";
      Elements.AuthSubtitle.textContent = "Secure your QiR panel by creating the primary administrator account.";
      return;
    }

    const meRes = await fetch("/api/auth/me");
    if (meRes.ok) {
      const meJson = await meRes.json();
      if (meJson.Success) {
        CurrentUser = meJson.Data;
        OnAuthenticated();
        return;
      }
    }

    Elements.AuthOverlay.style.display = "flex";
    Elements.AppWrapper.style.setProperty("display", "none", "important");
    Elements.LoginForm.classList.remove("d-none");
    Elements.SetupForm.classList.add("d-none");
    Elements.AuthTitle.textContent = "Sign In";
    Elements.AuthSubtitle.textContent = "Authenticate to access your private Docker panel.";
  } catch {
    Elements.AuthOverlay.style.display = "flex";
    Elements.AppWrapper.style.setProperty("display", "none", "important");
  }
}

function OnAuthenticated() {
  Elements.AuthOverlay.style.display = "none";
  Elements.AppWrapper.style.removeProperty("display");
  Elements.CurrentUsernameText.textContent = CurrentUser ? CurrentUser.Username : "Admin";

  InitializeDashboard();
}

function SetupAuthEventListeners() {
  Elements.LoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    HideAuthError();
    Elements.LoginSubmitBtn.disabled = true;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Username: Elements.LoginUsername.value.trim(),
          Password: Elements.LoginPassword.value,
        }),
      });

      const json = await res.json();
      if (json.Success) {
        CurrentUser = json.Data.User;
        CurrentAuthToken = json.Data.Token;
        OnAuthenticated();
      } else {
        ShowAuthError(json.Error || "Authentication failed");
      }
    } catch {
      ShowAuthError("Network error attempting login");
    } finally {
      Elements.LoginSubmitBtn.disabled = false;
    }
  });

  Elements.SetupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    HideAuthError();

    const username = Elements.SetupUsername.value.trim();
    const password = Elements.SetupPassword.value;
    const confirm = Elements.SetupConfirmPassword.value;

    if (password !== confirm) {
      ShowAuthError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      ShowAuthError("Password must be at least 8 characters long");
      return;
    }

    Elements.SetupSubmitBtn.disabled = true;

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: username, Password: password }),
      });

      const json = await res.json();
      if (json.Success) {
        CurrentUser = json.Data.User;
        CurrentAuthToken = json.Data.Token;
        OnAuthenticated();
      } else {
        ShowAuthError(json.Error || "Failed to initialize admin");
      }
    } catch {
      ShowAuthError("Network error during setup");
    } finally {
      Elements.SetupSubmitBtn.disabled = false;
    }
  });

  Elements.LogoutButton.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    CurrentUser = null;
    CurrentAuthToken = null;
    for (const interval of PollingIntervals) {
      clearInterval(interval);
    }
    PollingIntervals = [];
    window.location.reload();
  });
}

function InitializeDashboard() {
  SetupNavigation();
  SetupEventListeners();

  Promise.all([FetchSystemStatus(), FetchTemplates()]).then(() => {
    FetchServers();
  });

  PollingIntervals.push(setInterval(FetchServers, 4000));
  PollingIntervals.push(setInterval(FetchSystemStatus, 10000));

  Elements.ConsoleModal.addEventListener("hidden.bs.modal", () => {
    CloseWebSockets();
    ActiveConsoleServerId = null;
  });
}

function SetupNavigation() {
  Elements.NavServers.addEventListener("click", (e) => {
    e.preventDefault();
    SwitchView("Servers");
  });

  Elements.NavTemplates.addEventListener("click", (e) => {
    e.preventDefault();
    SwitchView("Templates");
  });

  Elements.NavSystem.addEventListener("click", (e) => {
    e.preventDefault();
    SwitchView("System");
  });
}

function SwitchView(viewName) {
  Elements.NavServers.classList.remove("active");
  Elements.NavTemplates.classList.remove("active");
  Elements.NavSystem.classList.remove("active");

  Elements.SectionServers.style.display = "none";
  Elements.SectionTemplates.style.display = "none";
  Elements.SectionSystem.style.display = "none";

  if (viewName === "Servers") {
    Elements.NavServers.classList.add("active");
    Elements.SectionServers.style.display = "block";
    Elements.PageTitle.textContent = "Container Instances";
    FetchServers();
  } else if (viewName === "Templates") {
    Elements.NavTemplates.classList.add("active");
    Elements.SectionTemplates.style.display = "block";
    Elements.PageTitle.textContent = "Hosting Blueprints & Templates";
    RenderTemplatesView();
  } else if (viewName === "System") {
    Elements.NavSystem.classList.add("active");
    Elements.SectionSystem.style.display = "block";
    Elements.PageTitle.textContent = "System & Docker Diagnostics";
    FetchSystemStatus();
  }
}

function SetupEventListeners() {
  Elements.RefreshButton.addEventListener("click", () => {
    FetchServers();
    FetchSystemStatus();
  });

  Elements.OpenDeployModalButton.addEventListener("click", OpenDeployModal);
  Elements.DeployTemplateSelect.addEventListener("change", HandleTemplateSelectionChange);
  Elements.DeployServerForm.addEventListener("submit", HandleDeploySubmit);
  Elements.SearchServersInput.addEventListener("input", () => RenderServersTable());
  Elements.ConsoleCommandForm.addEventListener("submit", HandleConsoleCommandSubmit);
}

async function FetchSystemStatus() {
  try {
    const res = await fetch("/api/system/status");
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const json = await res.json();
    if (json.Success) {
      const data = json.Data;
      Elements.HostPlatformSidebar.textContent = `${data.Platform} (${data.Architecture})`;

      if (data.DockerConnected) {
        Elements.DockerStatusBadge.className = "badge text-bg-success";
        Elements.DockerStatusBadge.textContent = "Connected";
        Elements.DockerSocketText.textContent = "Docker Engine online";
      } else {
        Elements.DockerStatusBadge.className = "badge text-bg-danger";
        Elements.DockerStatusBadge.textContent = "Disconnected";
        Elements.DockerSocketText.textContent = "Docker daemon unreachable";
      }

      RenderSystemDiagnostics(data);
    }
  } catch {
    Elements.DockerStatusBadge.className = "badge text-bg-danger";
    Elements.DockerStatusBadge.textContent = "Offline";
  }
}

function RenderSystemDiagnostics(data) {
  Elements.HostInfoTableBody.innerHTML = `
    <tr><td class="text-body-secondary ps-3">Operating System</td><td class="font-monospace">${EscapeHtml(data.Platform)}</td></tr>
    <tr><td class="text-body-secondary ps-3">CPU Architecture</td><td class="font-monospace">${EscapeHtml(data.Architecture)}</td></tr>
    <tr><td class="text-body-secondary ps-3">Logical CPU Cores</td><td class="font-monospace">${data.CpuCount} Cores</td></tr>
    <tr><td class="text-body-secondary ps-3">Total RAM</td><td class="font-monospace">${(data.TotalMemoryBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</td></tr>
    <tr><td class="text-body-secondary ps-3">Free RAM</td><td class="font-monospace">${(data.FreeMemoryBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</td></tr>
    <tr><td class="text-body-secondary ps-3">Node.js Runtime</td><td class="font-monospace">${EscapeHtml(data.NodeVersion)}</td></tr>
    <tr><td class="text-body-secondary ps-3">Process Uptime</td><td class="font-monospace">${Math.floor(data.UptimeSeconds)} seconds</td></tr>
  `;

  let versionHtml = "Not Available";
  if (data.DockerVersion && typeof data.DockerVersion === "object") {
    versionHtml = `<pre class="mb-0 font-monospace small" style="max-height: 200px; overflow-y: auto;">${EscapeHtml(JSON.stringify(data.DockerVersion, null, 2))}</pre>`;
  }

  Elements.DockerDiagTableBody.innerHTML = `
    <tr><td class="text-body-secondary ps-3">Daemon Status</td><td><span class="badge ${data.DockerConnected ? "text-bg-success" : "text-bg-danger"}">${data.DockerConnected ? "Online" : "Offline"}</span></td></tr>
    <tr><td class="text-body-secondary ps-3">Engine Details</td><td>${versionHtml}</td></tr>
  `;
}

async function FetchTemplates() {
  try {
    const res = await fetch("/api/templates");
    if (res.status === 401) return;
    const json = await res.json();
    if (json.Success) {
      Templates = json.Data;
      Elements.NavTemplatesBadge.textContent = String(Templates.length);
      Elements.TemplatesAvailableCount.textContent = String(Templates.length);
      PopulateDeployTemplateSelect();
    }
  } catch {}
}

function PopulateDeployTemplateSelect() {
  Elements.DeployTemplateSelect.innerHTML = "";
  for (const t of Templates) {
    const opt = document.createElement("option");
    opt.value = t.Id;
    opt.textContent = `${t.Name} (${t.Category})`;
    Elements.DeployTemplateSelect.appendChild(opt);
  }
  HandleTemplateSelectionChange();
}

function HandleTemplateSelectionChange() {
  const selectedId = Elements.DeployTemplateSelect.value;
  const template = Templates.find((t) => t.Id === selectedId);
  if (!template) return;

  Elements.DeployTemplateDescAlert.classList.remove("d-none");
  Elements.DeployTemplateDescAlert.textContent = template.Description;

  if (template.DefaultPorts && template.DefaultPorts.length > 0) {
    Elements.DeployHostPortInput.placeholder = `Default: ${template.DefaultPorts[0].HostPort}`;
  } else {
    Elements.DeployHostPortInput.placeholder = "None required";
  }

  Elements.DeployDynamicFields.innerHTML = "";
  for (const field of template.Fields) {
    const mb = document.createElement("div");
    mb.className = "mb-3";

    const label = document.createElement("label");
    label.className = "form-label small fw-semibold";
    label.textContent = field.Label;
    if (field.Required) label.textContent += " *";
    mb.appendChild(label);

    let input;
    if (field.Type === "select" && field.Options) {
      input = document.createElement("select");
      input.className = "form-select form-select-sm";
      for (const optVal of field.Options) {
        const option = document.createElement("option");
        option.value = optVal;
        option.textContent = optVal;
        if (optVal === field.DefaultValue) option.selected = true;
        input.appendChild(option);
      }
    } else {
      input = document.createElement("input");
      input.className = "form-control form-control-sm font-monospace";
      input.type = field.Type === "password" ? "password" : "text";
      input.value = field.DefaultValue || "";
      input.placeholder = field.Description || "";
    }

    input.dataset.envKey = field.Key;
    if (field.Required) input.required = true;

    mb.appendChild(input);

    if (field.Description) {
      const helper = document.createElement("div");
      helper.className = "form-text";
      helper.textContent = field.Description;
      mb.appendChild(helper);
    }

    Elements.DeployDynamicFields.appendChild(mb);
  }
}

function RenderTemplatesView() {
  Elements.TemplatesGrid.innerHTML = "";
  for (const t of Templates) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-xl-3";
    col.innerHTML = `
      <div class="card MetricCard shadow-sm h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="badge text-bg-secondary font-monospace">${EscapeHtml(t.Category)}</span>
            <span class="badge text-bg-dark border font-monospace">${EscapeHtml(t.DefaultImage)}</span>
          </div>
          <h5 class="card-title fw-bold fs-6 mb-1">${EscapeHtml(t.Name)}</h5>
          <p class="card-text small text-body-secondary mb-3 flex-grow-1">${EscapeHtml(t.Description)}</p>
          <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-auto">
            <span class="small font-monospace text-body-tertiary">Mount: ${EscapeHtml(t.VolumeMountPath || "None")}</span>
            <button class="btn btn-sm btn-outline-primary" data-template-id="${EscapeHtml(t.Id)}">Deploy</button>
          </div>
        </div>
      </div>
    `;

    const deployBtn = col.querySelector("button");
    deployBtn.addEventListener("click", () => {
      Elements.DeployTemplateSelect.value = t.Id;
      HandleTemplateSelectionChange();
      OpenDeployModal();
    });

    Elements.TemplatesGrid.appendChild(col);
  }
}

async function FetchServers() {
  try {
    const res = await fetch("/api/servers");
    if (res.status === 401) return;
    const json = await res.json();
    if (json.Success) {
      Servers = json.Data;
      RenderServersTable();
    }
  } catch {}
}

function RenderServersTable() {
  Elements.NavServersBadge.textContent = String(Servers.length);
  Elements.TotalContainersCount.textContent = String(Servers.length);

  const runningCount = Servers.filter((s) => s.Status === "Running").length;
  const stoppedCount = Servers.filter((s) => s.Status !== "Running").length;

  Elements.RunningContainersCount.textContent = String(runningCount);
  Elements.StoppedContainersCount.textContent = String(stoppedCount);

  const filterText = Elements.SearchServersInput.value.trim().toLowerCase();
  const filtered = filterText
    ? Servers.filter(
        (s) =>
          s.Name.toLowerCase().includes(filterText) ||
          s.TemplateId.toLowerCase().includes(filterText) ||
          s.ContainerId.toLowerCase().includes(filterText)
      )
    : Servers;

  if (filtered.length === 0) {
    Elements.ServersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-body-secondary">
          <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
          ${Servers.length === 0 ? "No container instances deployed yet." : "No matching containers found."}
        </td>
      </tr>
    `;
    return;
  }

  Elements.ServersTableBody.innerHTML = "";
  for (const server of filtered) {
    const tr = document.createElement("tr");

    const template = Templates.find((t) => t.Id === server.TemplateId);
    const templateLabel = template ? template.Name : server.TemplateId;

    let statusBadgeClass = "text-bg-secondary";
    if (server.Status === "Running") statusBadgeClass = "text-bg-success";
    else if (server.Status === "Starting" || server.Status === "Restarting")
      statusBadgeClass = "text-bg-warning text-dark";
    else if (server.Status === "Error") statusBadgeClass = "text-bg-danger";

    const portsText =
      server.Ports && server.Ports.length > 0
        ? server.Ports.map((p) => `${p.HostPort}:${p.ContainerPort}/${p.Protocol}`).join(", ")
        : "-";

    tr.innerHTML = `
      <td class="ps-3">
        <div class="fw-bold text-body">${EscapeHtml(server.Name)}</div>
        <div class="small font-monospace text-body-tertiary" style="font-size: 0.75rem;">${EscapeHtml(server.Id)}</div>
      </td>
      <td>
        <span class="badge text-bg-dark border font-monospace">${EscapeHtml(templateLabel)}</span>
      </td>
      <td>
        <span class="badge ${statusBadgeClass}">${server.Status}</span>
      </td>
      <td class="font-monospace small">${EscapeHtml(portsText)}</td>
      <td class="font-monospace small text-body-secondary">${server.ContainerId.slice(0, 12)}</td>
      <td class="text-end pe-3">
        <div class="btn-group btn-group-sm">
          ${
            server.Status === "Running"
              ? `<button class="btn btn-outline-warning" data-action="stop" data-id="${server.Id}" title="Stop Container"><i class="bi bi-stop-fill"></i></button>
                 <button class="btn btn-outline-info" data-action="restart" data-id="${server.Id}" title="Restart Container"><i class="bi bi-arrow-repeat"></i></button>`
              : `<button class="btn btn-outline-success" data-action="start" data-id="${server.Id}" title="Start Container"><i class="bi bi-play-fill"></i></button>`
          }
          <button class="btn btn-outline-primary" data-action="console" data-id="${server.Id}" title="Open Console"><i class="bi bi-terminal"></i></button>
          <button class="btn btn-outline-danger" data-action="delete" data-id="${server.Id}" title="Delete Container"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;

    Elements.ServersTableBody.appendChild(tr);
  }

  AttachTableActionListeners();
}

function AttachTableActionListeners() {
  const buttons = Elements.ServersTableBody.querySelectorAll("button[data-action]");
  for (const btn of buttons) {
    btn.addEventListener("click", async (e) => {
      const target = e.currentTarget;
      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === "start") {
        target.disabled = true;
        await PostServerAction(id, "start");
        await FetchServers();
      } else if (action === "stop") {
        target.disabled = true;
        await PostServerAction(id, "stop");
        await FetchServers();
      } else if (action === "restart") {
        target.disabled = true;
        await PostServerAction(id, "restart");
        await FetchServers();
      } else if (action === "delete") {
        if (confirm("Are you sure you want to delete this container?")) {
          target.disabled = true;
          await DeleteServer(id);
          await FetchServers();
        }
      } else if (action === "console") {
        OpenConsole(id);
      }
    });
  }
}

async function PostServerAction(id, action) {
  try {
    await fetch(`/api/servers/${id}/${action}`, { method: "POST" });
  } catch {}
}

async function DeleteServer(id) {
  try {
    await fetch(`/api/servers/${id}`, { method: "DELETE" });
  } catch {}
}

function OpenDeployModal() {
  const modal = GetBootstrapModal(Elements.DeployModal);
  if (modal) {
    modal.show();
  }
}

async function HandleDeploySubmit(e) {
  e.preventDefault();
  const name = Elements.DeployNameInput.value.trim();
  const templateId = Elements.DeployTemplateSelect.value;
  const template = Templates.find((t) => t.Id === templateId);
  const autoRestart = Elements.DeployAutoRestartInput.checked;

  const env = {};
  const inputs = Elements.DeployDynamicFields.querySelectorAll("[data-env-key]");
  for (const input of inputs) {
    env[input.dataset.envKey] = input.value;
  }

  const ports = [];
  const hostPortVal = Elements.DeployHostPortInput.value;
  if (hostPortVal) {
    const hostPort = Number(hostPortVal);
    const containerPort = template?.DefaultPorts[0]?.ContainerPort || hostPort;
    const protocol = template?.DefaultPorts[0]?.Protocol || "tcp";
    ports.push({ HostPort: hostPort, ContainerPort: containerPort, Protocol: protocol });
  }

  const payload = {
    Name: name,
    TemplateId: templateId,
    AutoRestart: autoRestart,
    EnvironmentVariables: env,
    Ports: ports.length > 0 ? ports : undefined,
  };

  try {
    const res = await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.Success) {
      const modal = GetBootstrapModal(Elements.DeployModal);
      if (modal) modal.hide();

      Elements.DeployServerForm.reset();
      HandleTemplateSelectionChange();
      await FetchServers();
      await PostServerAction(json.Data.Id, "start");
      await FetchServers();
      OpenConsole(json.Data.Id);
    } else {
      alert("Deployment failed: " + JSON.stringify(json.Error));
    }
  } catch {
    alert("Network error deploying container");
  }
}

function OpenConsole(serverId) {
  const server = Servers.find((s) => s.Id === serverId);
  if (!server) return;

  ActiveConsoleServerId = serverId;
  Elements.ConsoleInstanceTitle.textContent = `${server.Name} Console`;
  Elements.ConsoleStatusBadge.textContent = server.Status;
  Elements.ConsoleStatusBadge.className = `badge ${server.Status === "Running" ? "text-bg-success" : "text-bg-secondary"}`;
  Elements.ConsoleTerminal.textContent = "Connecting to container terminal stream...\n";

  const modal = GetBootstrapModal(Elements.ConsoleModal);
  if (modal) {
    modal.show();
  }

  CloseWebSockets();

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const tokenQuery = CurrentAuthToken ? `?token=${encodeURIComponent(CurrentAuthToken)}` : "";

  ConsoleSocket = new WebSocket(`${protocol}//${host}/ws/servers/${serverId}/console${tokenQuery}`);
  ConsoleSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.Type === "History") {
        Elements.ConsoleTerminal.textContent = msg.Data || "";
        Elements.ConsoleTerminal.scrollTop = Elements.ConsoleTerminal.scrollHeight;
      } else if (msg.Type === "Log" || msg.Type === "CommandOutput") {
        Elements.ConsoleTerminal.textContent += msg.Data;
        Elements.ConsoleTerminal.scrollTop = Elements.ConsoleTerminal.scrollHeight;
      } else if (msg.Type === "Error") {
        Elements.ConsoleTerminal.textContent += `\n[System Error] ${msg.Data}\n`;
      }
    } catch {
      Elements.ConsoleTerminal.textContent += event.data;
    }
  };

  StatsSocket = new WebSocket(`${protocol}//${host}/ws/servers/${serverId}/stats${tokenQuery}`);
  StatsSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.Type === "Stats" && msg.Data) {
        const stats = msg.Data;
        Elements.ConsoleCpuMetric.textContent = `CPU: ${stats.CpuPercentage}%`;
        const memMb = (stats.MemoryUsageBytes / (1024 * 1024)).toFixed(1);
        Elements.ConsoleRamMetric.textContent = `RAM: ${memMb} MB`;
      }
    } catch {}
  };
}

function CloseWebSockets() {
  if (ConsoleSocket) {
    ConsoleSocket.close();
    ConsoleSocket = null;
  }
  if (StatsSocket) {
    StatsSocket.close();
    StatsSocket = null;
  }
}

function HandleConsoleCommandSubmit(e) {
  e.preventDefault();
  const cmd = Elements.ConsoleCommandInput.value.trim();
  if (!cmd || !ConsoleSocket || ConsoleSocket.readyState !== WebSocket.OPEN) return;

  ConsoleSocket.send(JSON.stringify({ Command: cmd }));
  Elements.ConsoleCommandInput.value = "";
}

function EscapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

SetupAuthEventListeners();
CheckAuthentication();
