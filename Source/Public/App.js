let Templates = [];
let Servers = [];
let UsersList = [];
let ActiveDetailServerId = null;
let ActiveDetailTab = "Console";
let ActiveDetailSubPath = "";
let ActiveEditFilePath = "";
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
  CurrentUserRoleBadge: document.getElementById("CurrentUserRoleBadge"),
  LogoutButton: document.getElementById("LogoutButton"),

  NavServers: document.getElementById("NavServers"),
  NavTemplates: document.getElementById("NavTemplates"),
  NavUsersItem: document.getElementById("NavUsersItem"),
  NavUsers: document.getElementById("NavUsers"),
  NavSystem: document.getElementById("NavSystem"),
  NavServersBadge: document.getElementById("NavServersBadge"),
  NavTemplatesBadge: document.getElementById("NavTemplatesBadge"),
  NavUsersBadge: document.getElementById("NavUsersBadge"),

  SectionServers: document.getElementById("SectionServers"),
  SectionServerDetail: document.getElementById("SectionServerDetail"),
  SectionUsers: document.getElementById("SectionUsers"),
  SectionTemplates: document.getElementById("SectionTemplates"),
  SectionSystem: document.getElementById("SectionSystem"),

  PageTitle: document.getElementById("PageTitle"),
  TopNavbarActions: document.getElementById("TopNavbarActions"),
  RefreshButton: document.getElementById("RefreshButton"),
  OpenDeployModalButton: document.getElementById("OpenDeployModalButton"),

  DockerStatusBadge: document.getElementById("DockerStatusBadge"),
  DockerSocketText: document.getElementById("DockerSocketText"),
  HostPlatformSidebar: document.getElementById("HostPlatformSidebar"),

  TotalContainersCount: document.getElementById("TotalContainersCount"),
  RunningContainersCount: document.getElementById("RunningContainersCount"),
  StoppedContainersCount: document.getElementById("StoppedContainersCount"),
  TemplatesAvailableCount: document.getElementById("TemplatesAvailableCount"),
  SearchServersInput: document.getElementById("SearchServersInput"),
  ServersTableBody: document.getElementById("ServersTableBody"),

  DetailServerTitle: document.getElementById("DetailServerTitle"),
  DetailStatusBadge: document.getElementById("DetailStatusBadge"),
  DetailTemplateBadge: document.getElementById("DetailTemplateBadge"),
  DetailServerId: document.getElementById("DetailServerId"),
  DetailContainerId: document.getElementById("DetailContainerId"),
  ServerDetailBackBtn: document.getElementById("ServerDetailBackBtn"),
  DetailStartBtn: document.getElementById("DetailStartBtn"),
  DetailStopBtn: document.getElementById("DetailStopBtn"),
  DetailRestartBtn: document.getElementById("DetailRestartBtn"),
  DetailKillBtn: document.getElementById("DetailKillBtn"),
  DetailDeleteBtn: document.getElementById("DetailDeleteBtn"),
  ServerDetailTabs: document.getElementById("ServerDetailTabs"),

  DetailTabConsole: document.getElementById("DetailTabConsole"),
  DetailCpuMetric: document.getElementById("DetailCpuMetric"),
  DetailRamMetric: document.getElementById("DetailRamMetric"),
  DetailCpuProgressBar: document.getElementById("DetailCpuProgressBar"),
  DetailRamProgressBar: document.getElementById("DetailRamProgressBar"),
  DetailConsoleAutoscroll: document.getElementById("DetailConsoleAutoscroll"),
  DetailConsoleClearBtn: document.getElementById("DetailConsoleClearBtn"),
  DetailTerminalOutput: document.getElementById("DetailTerminalOutput"),
  DetailTerminalForm: document.getElementById("DetailTerminalForm"),
  DetailTerminalInput: document.getElementById("DetailTerminalInput"),

  DetailTabFiles: document.getElementById("DetailTabFiles"),
  DetailFilesCurrentPath: document.getElementById("DetailFilesCurrentPath"),
  DetailFilesRefreshBtn: document.getElementById("DetailFilesRefreshBtn"),
  DetailFilesUploadBtn: document.getElementById("DetailFilesUploadBtn"),
  DetailFilesHiddenInput: document.getElementById("DetailFilesHiddenInput"),
  DetailFilesNewFolderBtn: document.getElementById("DetailFilesNewFolderBtn"),
  DetailFilesNewFileBtn: document.getElementById("DetailFilesNewFileBtn"),
  DetailFilesTableBody: document.getElementById("DetailFilesTableBody"),

  DetailTabBackups: document.getElementById("DetailTabBackups"),
  DetailBackupsCountBadge: document.getElementById("DetailBackupsCountBadge"),
  OpenCreateBackupModalBtn: document.getElementById("OpenCreateBackupModalBtn"),
  DetailBackupsTableBody: document.getElementById("DetailBackupsTableBody"),

  DetailTabConfig: document.getElementById("DetailTabConfig"),
  DetailEnvVarsContainer: document.getElementById("DetailEnvVarsContainer"),
  DetailAddEnvVarBtn: document.getElementById("DetailAddEnvVarBtn"),
  DetailMemoryLimitSelect: document.getElementById("DetailMemoryLimitSelect"),
  DetailCpuSharesSelect: document.getElementById("DetailCpuSharesSelect"),
  DetailAutoRestartSwitch: document.getElementById("DetailAutoRestartSwitch"),
  DetailSaveConfigBtn: document.getElementById("DetailSaveConfigBtn"),
  DetailPortsContainer: document.getElementById("DetailPortsContainer"),

  DetailTabNetworking: document.getElementById("DetailTabNetworking"),
  DetailSubdomainInput: document.getElementById("DetailSubdomainInput"),
  DetailCaddySnippetPre: document.getElementById("DetailCaddySnippetPre"),
  DetailCopyCaddyBtn: document.getElementById("DetailCopyCaddyBtn"),
  DetailNetworkInfoContainer: document.getElementById("DetailNetworkInfoContainer"),

  DetailTabActivity: document.getElementById("DetailTabActivity"),
  DetailRefreshAuditBtn: document.getElementById("DetailRefreshAuditBtn"),
  DetailAuditTableBody: document.getElementById("DetailAuditTableBody"),

  DetailTabDocker: document.getElementById("DetailTabDocker"),
  DetailDockerInspectPre: document.getElementById("DetailDockerInspectPre"),
  DetailCopyInspectBtn: document.getElementById("DetailCopyInspectBtn"),

  UsersTotalCount: document.getElementById("UsersTotalCount"),
  UsersAdminCount: document.getElementById("UsersAdminCount"),
  UsersStandardCount: document.getElementById("UsersStandardCount"),
  UsersTableBody: document.getElementById("UsersTableBody"),
  OpenCreateUserModalBtn: document.getElementById("OpenCreateUserModalBtn"),
  CreateUserModal: document.getElementById("CreateUserModal"),
  CreateUserForm: document.getElementById("CreateUserForm"),
  CreateUserErrorAlert: document.getElementById("CreateUserErrorAlert"),
  CreateUsernameInput: document.getElementById("CreateUsernameInput"),
  CreatePasswordInput: document.getElementById("CreatePasswordInput"),
  CreateRoleSelect: document.getElementById("CreateRoleSelect"),
  CreateUserSubmitBtn: document.getElementById("CreateUserSubmitBtn"),

  UserWorkloadsModal: document.getElementById("UserWorkloadsModal"),
  UserWorkloadsModalUsername: document.getElementById("UserWorkloadsModalUsername"),
  UserWorkloadsTableBody: document.getElementById("UserWorkloadsTableBody"),

  FileEditorModal: document.getElementById("FileEditorModal"),
  FileEditorPathLabel: document.getElementById("FileEditorPathLabel"),
  FileEditorSaveBtn: document.getElementById("FileEditorSaveBtn"),
  FileEditorTextarea: document.getElementById("FileEditorTextarea"),

  NewFileModal: document.getElementById("NewFileModal"),
  NewFileForm: document.getElementById("NewFileForm"),
  NewFileNameInput: document.getElementById("NewFileNameInput"),
  NewFileInitialContentInput: document.getElementById("NewFileInitialContentInput"),
  NewFileSubmitBtn: document.getElementById("NewFileSubmitBtn"),

  NewFolderModal: document.getElementById("NewFolderModal"),
  NewFolderForm: document.getElementById("NewFolderForm"),
  NewFolderNameInput: document.getElementById("NewFolderNameInput"),
  NewFolderSubmitBtn: document.getElementById("NewFolderSubmitBtn"),

  RenameModal: document.getElementById("RenameModal"),
  RenameForm: document.getElementById("RenameForm"),
  RenameOldPathInput: document.getElementById("RenameOldPathInput"),
  RenameNewNameInput: document.getElementById("RenameNewNameInput"),
  RenameSubmitBtn: document.getElementById("RenameSubmitBtn"),

  CreateBackupModal: document.getElementById("CreateBackupModal"),
  CreateBackupForm: document.getElementById("CreateBackupForm"),
  BackupNameInput: document.getElementById("BackupNameInput"),
  CreateBackupSubmitBtn: document.getElementById("CreateBackupSubmitBtn"),

  DeployModal: document.getElementById("DeployModal"),
  DeployServerForm: document.getElementById("DeployServerForm"),
  DeployNameInput: document.getElementById("DeployNameInput"),
  DeployTemplateSelect: document.getElementById("DeployTemplateSelect"),
  DeployTemplateDescAlert: document.getElementById("DeployTemplateDescAlert"),
  DeployDynamicFields: document.getElementById("DeployDynamicFields"),
  DeployHostPortInput: document.getElementById("DeployHostPortInput"),
  DeployAutoRestartInput: document.getElementById("DeployAutoRestartInput"),

  TemplatesGrid: document.getElementById("TemplatesGrid"),
  HostInfoTableBody: document.getElementById("HostInfoTableBody"),
  DockerDiagTableBody: document.getElementById("DockerDiagTableBody"),
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

function ParseAnsiToHtml(rawText) {
  if (!rawText) return "";

  const escaped = EscapeHtml(rawText);

  let activeClasses = [];
  const tokens = escaped.split(/(\x1b\[[0-9;]*m|\x1b\[\?[0-9;]*[a-zA-Z]|\x1b\[[0-9;]*[a-zA-Z]|\r\n|\r|\n)/);
  let html = "";

  for (const token of tokens) {
    if (!token) continue;

    if (token.startsWith("\x1b[")) {
      if (token.endsWith("m")) {
        const paramStr = token.slice(2, -1);
        const codes = paramStr ? paramStr.split(";").map(Number) : [0];

        for (const code of codes) {
          if (code === 0) {
            activeClasses = [];
          } else if (code === 1) {
            if (!activeClasses.includes("ansi-bold")) activeClasses.push("ansi-bold");
          } else if (code === 2) {
            if (!activeClasses.includes("ansi-dim")) activeClasses.push("ansi-dim");
          } else if (code === 3) {
            if (!activeClasses.includes("ansi-italic")) activeClasses.push("ansi-italic");
          } else if (code === 4) {
            if (!activeClasses.includes("ansi-underline")) activeClasses.push("ansi-underline");
          } else if (code === 22) {
            activeClasses = activeClasses.filter((c) => c !== "ansi-bold" && c !== "ansi-dim");
          } else if (code === 23) {
            activeClasses = activeClasses.filter((c) => c !== "ansi-italic");
          } else if (code === 24) {
            activeClasses = activeClasses.filter((c) => c !== "ansi-underline");
          } else if (code >= 30 && code <= 37) {
            const colorNames = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
            activeClasses = activeClasses.filter((c) => !c.startsWith("ansi-red") && !c.startsWith("ansi-green") && !c.startsWith("ansi-yellow") && !c.startsWith("ansi-blue") && !c.startsWith("ansi-magenta") && !c.startsWith("ansi-cyan") && !c.startsWith("ansi-white") && !c.startsWith("ansi-black") && !c.startsWith("ansi-bright-"));
            activeClasses.push(`ansi-${colorNames[code - 30]}`);
          } else if (code === 39) {
            activeClasses = activeClasses.filter((c) => !c.startsWith("ansi-red") && !c.startsWith("ansi-green") && !c.startsWith("ansi-yellow") && !c.startsWith("ansi-blue") && !c.startsWith("ansi-magenta") && !c.startsWith("ansi-cyan") && !c.startsWith("ansi-white") && !c.startsWith("ansi-black") && !c.startsWith("ansi-bright-"));
          } else if (code >= 90 && code <= 97) {
            const colorNames = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
            activeClasses = activeClasses.filter((c) => !c.startsWith("ansi-red") && !c.startsWith("ansi-green") && !c.startsWith("ansi-yellow") && !c.startsWith("ansi-blue") && !c.startsWith("ansi-magenta") && !c.startsWith("ansi-cyan") && !c.startsWith("ansi-white") && !c.startsWith("ansi-black") && !c.startsWith("ansi-bright-"));
            activeClasses.push(`ansi-bright-${colorNames[code - 90]}`);
          }
        }
      }
      continue;
    }

    if (token === "\r" || token === "\r\n" || token === "\n") {
      html += "\n";
      continue;
    }

    if (activeClasses.length > 0) {
      html += `<span class="${activeClasses.join(" ")}">${token}</span>`;
    } else {
      html += token;
    }
  }

  return html;
}

async function CheckAuthentication() {
  try {
    const setupRes = await fetch("/api/auth/setup-status");
    const setupJson = await setupRes.json();

    if (setupJson.Success && setupJson.Data.SetupRequired) {
      Elements.AuthOverlay.classList.remove("hidden");
      Elements.AppWrapper.classList.add("hidden");
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

    Elements.AuthOverlay.classList.remove("hidden");
    Elements.AppWrapper.classList.add("hidden");
    Elements.LoginForm.classList.remove("d-none");
    Elements.SetupForm.classList.add("d-none");
    Elements.AuthTitle.textContent = "Sign In";
    Elements.AuthSubtitle.textContent = "Authenticate to access your private Docker panel.";
  } catch {
    Elements.AuthOverlay.classList.remove("hidden");
    Elements.AppWrapper.classList.add("hidden");
  }
}

function OnAuthenticated() {
  Elements.AuthOverlay.classList.add("hidden");
  Elements.AppWrapper.classList.remove("hidden");
  Elements.CurrentUsernameText.textContent = CurrentUser ? CurrentUser.Username : "Admin";
  Elements.CurrentUserRoleBadge.textContent = CurrentUser?.Role === "admin" ? "Admin" : "User";

  if (CurrentUser?.Role === "admin") {
    Elements.NavUsersItem.classList.remove("d-none");
  } else {
    Elements.NavUsersItem.classList.add("d-none");
  }

  InitializeDashboard();
}

function SetupAuthEventListeners() {
  Elements.LoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    HideAuthError();
    Elements.LoginSubmitBtn.disabled = true;
    Elements.LoginSubmitBtn.textContent = "Signing In...";

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
      Elements.LoginSubmitBtn.textContent = "Sign In";
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
    Elements.SetupSubmitBtn.textContent = "Initializing...";

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
      Elements.SetupSubmitBtn.textContent = "Initialize & Secure Panel";
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
    if (CurrentUser?.Role === "admin") {
      FetchUsers();
    }
  });

  PollingIntervals.push(setInterval(() => {
    if (!ActiveDetailServerId) {
      FetchServers();
    } else {
      FetchSingleServer(ActiveDetailServerId);
    }
  }, 4000));
  PollingIntervals.push(setInterval(FetchSystemStatus, 10000));
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

  Elements.NavUsers.addEventListener("click", (e) => {
    e.preventDefault();
    SwitchView("Users");
  });

  Elements.NavSystem.addEventListener("click", (e) => {
    e.preventDefault();
    SwitchView("System");
  });

  Elements.ServerDetailBackBtn.addEventListener("click", () => {
    CloseWebSockets();
    ActiveDetailServerId = null;
    SwitchView("Servers");
  });

  const tabLinks = Elements.ServerDetailTabs.querySelectorAll("a.nav-link");
  for (const tabLink of tabLinks) {
    tabLink.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = tabLink.dataset.tab;
      SwitchDetailTab(tabName);
    });
  }
}

function SwitchView(viewName) {
  Elements.NavServers.classList.remove("active");
  Elements.NavTemplates.classList.remove("active");
  Elements.NavUsers.classList.remove("active");
  Elements.NavSystem.classList.remove("active");

  Elements.SectionServers.classList.add("d-none");
  Elements.SectionServerDetail.classList.add("d-none");
  Elements.SectionUsers.classList.add("d-none");
  Elements.SectionTemplates.classList.add("d-none");
  Elements.SectionSystem.classList.add("d-none");

  Elements.TopNavbarActions.classList.remove("d-none");

  if (viewName === "Servers") {
    Elements.NavServers.classList.add("active");
    Elements.SectionServers.classList.remove("d-none");
    Elements.PageTitle.textContent = "Container Instances";
    FetchServers();
  } else if (viewName === "ServerDetail") {
    Elements.NavServers.classList.add("active");
    Elements.SectionServerDetail.classList.remove("d-none");
    Elements.PageTitle.textContent = "Server Control Panel";
    Elements.TopNavbarActions.classList.add("d-none");
  } else if (viewName === "Users") {
    Elements.NavUsers.classList.add("active");
    Elements.SectionUsers.classList.remove("d-none");
    Elements.PageTitle.textContent = "System User Management";
    FetchUsers();
  } else if (viewName === "Templates") {
    Elements.NavTemplates.classList.add("active");
    Elements.SectionTemplates.classList.remove("d-none");
    Elements.PageTitle.textContent = "Hosting Blueprints & Templates";
    RenderTemplatesView();
  } else if (viewName === "System") {
    Elements.NavSystem.classList.add("active");
    Elements.SectionSystem.classList.remove("d-none");
    Elements.PageTitle.textContent = "System & Docker Diagnostics";
    FetchSystemStatus();
  }
}

function SwitchDetailTab(tabName) {
  ActiveDetailTab = tabName;

  const tabLinks = Elements.ServerDetailTabs.querySelectorAll("a.nav-link");
  for (const link of tabLinks) {
    link.classList.toggle("active", link.dataset.tab === tabName);
  }

  Elements.DetailTabConsole.classList.toggle("d-none", tabName !== "Console");
  Elements.DetailTabFiles.classList.toggle("d-none", tabName !== "Files");
  Elements.DetailTabBackups.classList.toggle("d-none", tabName !== "Backups");
  Elements.DetailTabConfig.classList.toggle("d-none", tabName !== "Config");
  Elements.DetailTabNetworking.classList.toggle("d-none", tabName !== "Networking");
  Elements.DetailTabActivity.classList.toggle("d-none", tabName !== "Activity");
  Elements.DetailTabDocker.classList.toggle("d-none", tabName !== "Docker");

  if (tabName === "Files") {
    FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
  } else if (tabName === "Backups") {
    FetchServerBackups(ActiveDetailServerId);
  } else if (tabName === "Docker") {
    FetchServerInspect(ActiveDetailServerId);
  } else if (tabName === "Config") {
    RenderServerConfigTab();
  } else if (tabName === "Networking") {
    RenderServerNetworkingTab();
  } else if (tabName === "Activity") {
    FetchServerAuditLogs(ActiveDetailServerId);
  }
}

function SetupEventListeners() {
  Elements.RefreshButton.addEventListener("click", () => {
    FetchServers();
    FetchSystemStatus();
    if (CurrentUser?.Role === "admin") FetchUsers();
  });

  Elements.OpenDeployModalButton.addEventListener("click", OpenDeployModal);
  Elements.DeployTemplateSelect.addEventListener("change", HandleTemplateSelectionChange);
  Elements.DeployServerForm.addEventListener("submit", HandleDeploySubmit);
  Elements.SearchServersInput.addEventListener("input", () => RenderServersTable());

  Elements.DetailTerminalForm.addEventListener("submit", HandleTerminalCommandSubmit);
  Elements.DetailConsoleClearBtn.addEventListener("click", () => {
    Elements.DetailTerminalOutput.innerHTML = "";
  });

  Elements.DetailStartBtn.addEventListener("click", () => HandleServerAction(ActiveDetailServerId, "start"));
  Elements.DetailStopBtn.addEventListener("click", () => HandleServerAction(ActiveDetailServerId, "stop"));
  Elements.DetailRestartBtn.addEventListener("click", () => HandleServerAction(ActiveDetailServerId, "restart"));
  Elements.DetailKillBtn.addEventListener("click", () => HandleServerAction(ActiveDetailServerId, "kill"));
  Elements.DetailDeleteBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to permanently delete this container and its volume data?")) {
      await DeleteServer(ActiveDetailServerId);
      ActiveDetailServerId = null;
      SwitchView("Servers");
    }
  });

  Elements.DetailFilesRefreshBtn.addEventListener("click", () => {
    FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
  });
  Elements.DetailFilesNewFileBtn.addEventListener("click", OpenNewFileModal);
  Elements.DetailFilesNewFolderBtn.addEventListener("click", OpenNewFolderModal);
  Elements.DetailFilesUploadBtn.addEventListener("click", () => {
    Elements.DetailFilesHiddenInput.click();
  });
  Elements.DetailFilesHiddenInput.addEventListener("change", HandleFileUpload);

  Elements.NewFileForm.addEventListener("submit", HandleNewFileSubmit);
  Elements.NewFolderForm.addEventListener("submit", HandleNewFolderSubmit);
  Elements.RenameForm.addEventListener("submit", HandleRenameSubmit);
  Elements.FileEditorSaveBtn.addEventListener("click", HandleFileEditorSave);

  Elements.OpenCreateBackupModalBtn.addEventListener("click", OpenCreateBackupModal);
  Elements.CreateBackupForm.addEventListener("submit", HandleCreateBackupSubmit);

  Elements.DetailAddEnvVarBtn.addEventListener("click", () => {
    AddEnvVarRow("", "");
  });
  Elements.DetailSaveConfigBtn.addEventListener("click", HandleSaveServerConfig);

  Elements.DetailSubdomainInput.addEventListener("input", UpdateCaddySnippet);
  Elements.DetailCopyCaddyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(Elements.DetailCaddySnippetPre.textContent);
    Elements.DetailCopyCaddyBtn.innerHTML = `<i class="bi bi-check2 me-1"></i> Copied!`;
    setTimeout(() => {
      Elements.DetailCopyCaddyBtn.innerHTML = `<i class="bi bi-clipboard me-1"></i> Copy Caddyfile Block`;
    }, 2000);
  });

  Elements.DetailRefreshAuditBtn.addEventListener("click", () => {
    FetchServerAuditLogs(ActiveDetailServerId);
  });

  Elements.DetailCopyInspectBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(Elements.DetailDockerInspectPre.textContent);
    Elements.DetailCopyInspectBtn.innerHTML = `<i class="bi bi-check2 me-1"></i> Copied!`;
    setTimeout(() => {
      Elements.DetailCopyInspectBtn.innerHTML = `<i class="bi bi-clipboard me-1"></i> Copy JSON`;
    }, 2000);
  });

  Elements.OpenCreateUserModalBtn.addEventListener("click", OpenCreateUserModal);
  Elements.CreateUserForm.addEventListener("submit", HandleCreateUserSubmit);
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
    label.className = "form-label small fw-medium";
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
          <h5 class="card-title fw-medium fs-6 mb-1">${EscapeHtml(t.Name)}</h5>
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

async function FetchSingleServer(serverId) {
  try {
    const res = await fetch(`/api/servers/${serverId}`);
    if (res.status === 401) return;
    const json = await res.json();
    if (json.Success) {
      const server = json.Data;
      const idx = Servers.findIndex((s) => s.Id === server.Id);
      if (idx !== -1) Servers[idx] = server;
      else Servers.push(server);

      if (ActiveDetailServerId === server.Id) {
        UpdateDetailServerHeader(server);
      }
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
        ? server.Ports.map((p) => `${p.HostPort}:${p.ContainerPort}`).join(", ")
        : "-";

    tr.innerHTML = `
      <td class="ps-3">
        <a href="#" class="text-decoration-none fw-medium text-body TableServerLink" data-id="${server.Id}">
          ${EscapeHtml(server.Name)}
        </a>
        <div class="small font-monospace text-body-tertiary" style="font-size: 0.73rem;">${EscapeHtml(server.Id)}</div>
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
        <div class="d-inline-flex align-items-center gap-1">
          <button class="btn btn-sm btn-outline-primary py-1 px-2" data-action="manage" data-id="${server.Id}">
            <i class="bi bi-gear me-1"></i> Manage
          </button>
          ${
            server.Status === "Running"
              ? `<button class="btn btn-ghost py-1 px-2 text-warning" data-action="stop" data-id="${server.Id}" title="Stop Container"><i class="bi bi-stop-fill"></i></button>`
              : `<button class="btn btn-ghost py-1 px-2 text-success" data-action="start" data-id="${server.Id}" title="Start Container"><i class="bi bi-play-fill"></i></button>`
          }
          <button class="btn btn-ghost-danger py-1 px-2" data-action="delete" data-id="${server.Id}" title="Delete Container"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;

    Elements.ServersTableBody.appendChild(tr);
  }

  AttachTableActionListeners();
}

function AttachTableActionListeners() {
  const links = Elements.ServersTableBody.querySelectorAll(".TableServerLink");
  for (const link of links) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      OpenServerDetail(link.dataset.id);
    });
  }

  const buttons = Elements.ServersTableBody.querySelectorAll("button[data-action]");
  for (const btn of buttons) {
    btn.addEventListener("click", async (e) => {
      const target = e.currentTarget;
      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === "manage") {
        OpenServerDetail(id);
      } else if (action === "start" || action === "stop" || action === "restart") {
        target.disabled = true;
        await PostServerAction(id, action);
        await FetchServers();
      } else if (action === "delete") {
        if (confirm("Are you sure you want to delete this container instance?")) {
          target.disabled = true;
          await DeleteServer(id);
          await FetchServers();
        }
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

function OpenServerDetail(serverId) {
  const server = Servers.find((s) => s.Id === serverId);
  if (!server) return;

  ActiveDetailServerId = serverId;
  ActiveDetailSubPath = "";

  UpdateDetailServerHeader(server);
  SwitchView("ServerDetail");
  SwitchDetailTab("Console");

  ConnectWebSockets(serverId);
}

function UpdateDetailServerHeader(server) {
  Elements.DetailServerTitle.textContent = server.Name;
  Elements.DetailServerId.textContent = server.Id;
  Elements.DetailContainerId.textContent = server.ContainerId.slice(0, 12);

  const template = Templates.find((t) => t.Id === server.TemplateId);
  Elements.DetailTemplateBadge.textContent = template ? template.Name : server.TemplateId;

  let statusBadgeClass = "text-bg-secondary";
  if (server.Status === "Running") statusBadgeClass = "text-bg-success";
  else if (server.Status === "Starting" || server.Status === "Restarting")
    statusBadgeClass = "text-bg-warning text-dark";
  else if (server.Status === "Error") statusBadgeClass = "text-bg-danger";

  Elements.DetailStatusBadge.className = `badge ${statusBadgeClass}`;
  Elements.DetailStatusBadge.textContent = server.Status;

  Elements.DetailStartBtn.disabled = server.Status === "Running";
  Elements.DetailStopBtn.disabled = server.Status !== "Running";
}

async function HandleServerAction(serverId, action) {
  try {
    await PostServerAction(serverId, action);
    await FetchSingleServer(serverId);
  } catch {}
}

function ConnectWebSockets(serverId) {
  CloseWebSockets();

  Elements.DetailTerminalOutput.innerHTML = `<span class="ansi-dim">Connecting to container terminal output stream...</span>\n`;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const tokenQuery = CurrentAuthToken ? `?token=${encodeURIComponent(CurrentAuthToken)}` : "";

  ConsoleSocket = new WebSocket(`${protocol}//${host}/ws/servers/${serverId}/console${tokenQuery}`);
  ConsoleSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.Type === "History") {
        Elements.DetailTerminalOutput.innerHTML = ParseAnsiToHtml(msg.Data || "");
        ScrollTerminalToBottom();
      } else if (msg.Type === "Log" || msg.Type === "CommandOutput") {
        Elements.DetailTerminalOutput.innerHTML += ParseAnsiToHtml(msg.Data || "");
        ScrollTerminalToBottom();
      } else if (msg.Type === "Error") {
        Elements.DetailTerminalOutput.innerHTML += `\n<span class="ansi-red">[System Error] ${EscapeHtml(msg.Data)}</span>\n`;
        ScrollTerminalToBottom();
      }
    } catch {
      Elements.DetailTerminalOutput.innerHTML += ParseAnsiToHtml(event.data);
      ScrollTerminalToBottom();
    }
  };

  StatsSocket = new WebSocket(`${protocol}//${host}/ws/servers/${serverId}/stats${tokenQuery}`);
  StatsSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.Type === "Stats" && msg.Data) {
        const stats = msg.Data;
        const cpuPct = Math.min(100, Math.max(0, stats.CpuPercentage || 0));
        Elements.DetailCpuMetric.textContent = `${cpuPct.toFixed(1)}%`;
        Elements.DetailCpuProgressBar.style.width = `${cpuPct}%`;
        if (cpuPct > 80) Elements.DetailCpuProgressBar.className = "progress-bar bg-danger";
        else if (cpuPct > 50) Elements.DetailCpuProgressBar.className = "progress-bar bg-warning";
        else Elements.DetailCpuProgressBar.className = "progress-bar bg-primary";

        const memMb = (stats.MemoryUsageBytes / (1024 * 1024)).toFixed(1);
        Elements.DetailRamMetric.textContent = `${memMb} MB`;
        const memPct = stats.MemoryLimitBytes ? Math.min(100, (stats.MemoryUsageBytes / stats.MemoryLimitBytes) * 100) : 20;
        Elements.DetailRamProgressBar.style.width = `${memPct}%`;
      }
    } catch {}
  };
}

function ScrollTerminalToBottom() {
  if (Elements.DetailConsoleAutoscroll.checked) {
    Elements.DetailTerminalOutput.scrollTop = Elements.DetailTerminalOutput.scrollHeight;
  }
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

function HandleTerminalCommandSubmit(e) {
  e.preventDefault();
  const cmd = Elements.DetailTerminalInput.value.trim();
  if (!cmd || !ConsoleSocket || ConsoleSocket.readyState !== WebSocket.OPEN) return;

  ConsoleSocket.send(JSON.stringify({ Command: cmd }));
  Elements.DetailTerminalInput.value = "";
}

async function FetchServerFiles(serverId, subPath = "") {
  ActiveDetailSubPath = subPath;
  Elements.DetailFilesCurrentPath.textContent = subPath ? `/${subPath}` : "/";

  try {
    const res = await fetch(`/api/servers/${serverId}/files?SubPath=${encodeURIComponent(subPath)}`);
    const json = await res.json();
    if (json.Success) {
      RenderServerFilesTable(json.Data);
    }
  } catch {
    Elements.DetailFilesTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center py-4 text-danger">Failed to load volume files.</td></tr>
    `;
  }
}

function RenderServerFilesTable(files) {
  Elements.DetailFilesTableBody.innerHTML = "";

  if (ActiveDetailSubPath) {
    const trUp = document.createElement("tr");
    trUp.innerHTML = `
      <td colspan="4" class="ps-3 py-2">
        <a href="#" class="text-decoration-none text-body small fw-medium" id="DirGoUpLink">
          <i class="bi bi-arrow-90deg-up me-2 text-primary"></i> .. (Parent Directory)
        </a>
      </td>
    `;
    Elements.DetailFilesTableBody.appendChild(trUp);
    trUp.querySelector("#DirGoUpLink").addEventListener("click", (e) => {
      e.preventDefault();
      const segments = ActiveDetailSubPath.split("/").filter(Boolean);
      segments.pop();
      FetchServerFiles(ActiveDetailServerId, segments.join("/"));
    });
  }

  if (files.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="4" class="text-center py-4 text-body-secondary">
        Directory is empty.
      </td>
    `;
    Elements.DetailFilesTableBody.appendChild(emptyRow);
    return;
  }

  const sorted = files.sort((a, b) => {
    if (a.IsDirectory && !b.IsDirectory) return -1;
    if (!a.IsDirectory && b.IsDirectory) return 1;
    return a.Name.localeCompare(b.Name);
  });

  for (const item of sorted) {
    const tr = document.createElement("tr");
    const relativePath = ActiveDetailSubPath ? `${ActiveDetailSubPath}/${item.Name}` : item.Name;
    const formattedSize = item.IsDirectory ? "-" : FormatBytes(item.Size);

    tr.innerHTML = `
      <td class="ps-3 py-2">
        <a href="#" class="text-decoration-none text-body small font-monospace FileItemLink" data-is-dir="${item.IsDirectory}" data-path="${EscapeHtml(relativePath)}">
          <i class="bi ${item.IsDirectory ? "bi-folder2 text-warning" : "bi-file-earmark-text text-primary"} me-2"></i>
          ${EscapeHtml(item.Name)}
        </a>
      </td>
      <td class="small text-body-secondary py-2">${item.IsDirectory ? "Folder" : "File"}</td>
      <td class="small font-monospace text-body-secondary py-2">${formattedSize}</td>
      <td class="text-end pe-3 py-2">
        <div class="d-inline-flex align-items-center gap-1">
          ${
            !item.IsDirectory
              ? `
                <button class="btn btn-ghost py-1 px-2" data-action="edit-file" data-path="${EscapeHtml(relativePath)}" title="Edit File"><i class="bi bi-pencil"></i></button>
                <a href="/api/servers/${ActiveDetailServerId}/files/download?FilePath=${encodeURIComponent(relativePath)}" class="btn btn-ghost py-1 px-2" title="Download File"><i class="bi bi-download"></i></a>
              `
              : ""
          }
          <button class="btn btn-ghost py-1 px-2" data-action="rename" data-path="${EscapeHtml(relativePath)}" data-name="${EscapeHtml(item.Name)}" title="Rename"><i class="bi bi-input-cursor-text"></i></button>
          <button class="btn btn-ghost-danger py-1 px-2" data-action="delete-file" data-path="${EscapeHtml(relativePath)}" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;

    Elements.DetailFilesTableBody.appendChild(tr);
  }

  const itemLinks = Elements.DetailFilesTableBody.querySelectorAll(".FileItemLink");
  for (const link of itemLinks) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const isDir = link.dataset.isDir === "true";
      const itemPath = link.dataset.path;
      if (isDir) {
        FetchServerFiles(ActiveDetailServerId, itemPath);
      } else {
        OpenFileEditor(ActiveDetailServerId, itemPath);
      }
    });
  }

  const actionButtons = Elements.DetailFilesTableBody.querySelectorAll("button[data-action]");
  for (const btn of actionButtons) {
    btn.addEventListener("click", async (e) => {
      const action = btn.dataset.action;
      const filePath = btn.dataset.path;

      if (action === "edit-file") {
        OpenFileEditor(ActiveDetailServerId, filePath);
      } else if (action === "rename") {
        OpenRenameModal(filePath, btn.dataset.name);
      } else if (action === "delete-file") {
        if (confirm(`Delete '${filePath}'?`)) {
          await DeleteServerFile(ActiveDetailServerId, filePath);
          FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
        }
      }
    });
  }
}

async function OpenFileEditor(serverId, filePath) {
  ActiveEditFilePath = filePath;
  Elements.FileEditorPathLabel.textContent = `/${filePath}`;
  Elements.FileEditorTextarea.value = "Loading file content...";

  const modal = GetBootstrapModal(Elements.FileEditorModal);
  if (modal) modal.show();

  try {
    const res = await fetch(`/api/servers/${serverId}/files/content?FilePath=${encodeURIComponent(filePath)}`);
    const json = await res.json();
    if (json.Success) {
      Elements.FileEditorTextarea.value = json.Data.Content;
    } else {
      Elements.FileEditorTextarea.value = `Error: ${json.Error || "Failed to read file"}`;
    }
  } catch {
    Elements.FileEditorTextarea.value = "Network error loading file content.";
  }
}

async function HandleFileEditorSave() {
  Elements.FileEditorSaveBtn.disabled = true;
  Elements.FileEditorSaveBtn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i> Saving...`;

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FilePath: ActiveEditFilePath,
        Content: Elements.FileEditorTextarea.value,
      }),
    });
    const json = await res.json();
    if (json.Success) {
      Elements.FileEditorSaveBtn.innerHTML = `<i class="bi bi-check2 me-1"></i> Saved!`;
      setTimeout(() => {
        Elements.FileEditorSaveBtn.innerHTML = `<i class="bi bi-save me-1"></i> Save Changes`;
        Elements.FileEditorSaveBtn.disabled = false;
      }, 1500);
    } else {
      alert("Save failed: " + (json.Error || "Unknown error"));
      Elements.FileEditorSaveBtn.disabled = false;
    }
  } catch {
    alert("Network error saving file.");
    Elements.FileEditorSaveBtn.disabled = false;
  }
}

async function DeleteServerFile(serverId, filePath) {
  try {
    await fetch(`/api/servers/${serverId}/files?FilePath=${encodeURIComponent(filePath)}`, {
      method: "DELETE",
    });
  } catch {}
}

function OpenNewFileModal() {
  Elements.NewFileForm.reset();
  const modal = GetBootstrapModal(Elements.NewFileModal);
  if (modal) modal.show();
}

async function HandleNewFileSubmit(e) {
  e.preventDefault();
  const rawName = Elements.NewFileNameInput.value.trim();
  const content = Elements.NewFileInitialContentInput.value;

  const targetPath = ActiveDetailSubPath ? `${ActiveDetailSubPath}/${rawName}` : rawName;

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ FilePath: targetPath, Content: content }),
    });
    const json = await res.json();
    if (json.Success) {
      const modal = GetBootstrapModal(Elements.NewFileModal);
      if (modal) modal.hide();
      FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
    } else {
      alert("Failed to create file: " + json.Error);
    }
  } catch {
    alert("Network error creating file");
  }
}

function OpenNewFolderModal() {
  Elements.NewFolderForm.reset();
  const modal = GetBootstrapModal(Elements.NewFolderModal);
  if (modal) modal.show();
}

async function HandleNewFolderSubmit(e) {
  e.preventDefault();
  const rawName = Elements.NewFolderNameInput.value.trim();
  const targetPath = ActiveDetailSubPath ? `${ActiveDetailSubPath}/${rawName}` : rawName;

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/mkdir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Path: targetPath }),
    });
    const json = await res.json();
    if (json.Success) {
      const modal = GetBootstrapModal(Elements.NewFolderModal);
      if (modal) modal.hide();
      FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
    } else {
      alert("Failed to create directory: " + json.Error);
    }
  } catch {
    alert("Network error creating directory");
  }
}

function OpenRenameModal(oldPath, oldName) {
  Elements.RenameOldPathInput.value = oldPath;
  Elements.RenameNewNameInput.value = oldName;
  const modal = GetBootstrapModal(Elements.RenameModal);
  if (modal) modal.show();
}

async function HandleRenameSubmit(e) {
  e.preventDefault();
  const oldPath = Elements.RenameOldPathInput.value;
  const newName = Elements.RenameNewNameInput.value.trim();

  const parts = oldPath.split("/");
  parts.pop();
  const newPath = parts.length > 0 ? `${parts.join("/")}/${newName}` : newName;

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ OldPath: oldPath, NewPath: newPath }),
    });
    const json = await res.json();
    if (json.Success) {
      const modal = GetBootstrapModal(Elements.RenameModal);
      if (modal) modal.hide();
      FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
    } else {
      alert("Failed to rename: " + json.Error);
    }
  } catch {
    alert("Network error renaming item");
  }
}

async function HandleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    const base64Content = reader.result.split(",")[1];
    const targetPath = ActiveDetailSubPath ? `${ActiveDetailSubPath}/${file.name}` : file.name;

    try {
      const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FilePath: targetPath,
          ContentBase64: base64Content,
        }),
      });
      const json = await res.json();
      if (json.Success) {
        FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
      } else {
        alert("Upload failed: " + json.Error);
      }
    } catch {
      alert("Network error uploading file");
    } finally {
      Elements.DetailFilesHiddenInput.value = "";
    }
  };
  reader.readAsDataURL(file);
}

async function FetchServerBackups(serverId) {
  try {
    const res = await fetch(`/api/servers/${serverId}/backups`);
    const json = await res.json();
    if (json.Success) {
      RenderServerBackupsTable(json.Data);
    }
  } catch {
    Elements.DetailBackupsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Failed to load backups.</td></tr>`;
  }
}

function RenderServerBackupsTable(backups) {
  Elements.DetailBackupsCountBadge.textContent = `${backups.length} snapshots`;

  if (backups.length === 0) {
    Elements.DetailBackupsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-body-secondary"><i class="bi bi-archive fs-2 d-block mb-2 text-secondary"></i>No backups generated yet. Create a snapshot to protect your data.</td></tr>`;
    return;
  }

  Elements.DetailBackupsTableBody.innerHTML = "";
  for (const b of backups) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="ps-3 py-2 fw-medium text-body">${EscapeHtml(b.Name)}</td>
      <td class="font-monospace small text-body-secondary py-2">${EscapeHtml(b.FileName)}</td>
      <td class="font-monospace small py-2">${FormatBytes(b.SizeBytes)}</td>
      <td class="font-monospace small text-body-secondary py-2">${EscapeHtml(b.CreatedAt.slice(0, 19).replace("T", " "))}</td>
      <td class="text-end pe-3 py-2">
        <div class="d-inline-flex align-items-center gap-1">
          <a href="/api/servers/${ActiveDetailServerId}/backups/${encodeURIComponent(b.FileName)}/download" class="btn btn-ghost py-1 px-2" title="Download Snapshot"><i class="bi bi-download"></i></a>
          <button class="btn btn-ghost-warning py-1 px-2" data-action="restore-backup" data-filename="${EscapeHtml(b.FileName)}" title="Restore Snapshot"><i class="bi bi-arrow-counterclockwise"></i></button>
          <button class="btn btn-ghost-danger py-1 px-2" data-action="delete-backup" data-filename="${EscapeHtml(b.FileName)}" title="Delete Snapshot"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;
    Elements.DetailBackupsTableBody.appendChild(tr);
  }

  const actionButtons = Elements.DetailBackupsTableBody.querySelectorAll("button[data-action]");
  for (const btn of actionButtons) {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      const fileName = btn.dataset.filename;

      if (action === "restore-backup") {
        if (confirm(`Restore '${fileName}'? Current volume data will be overwritten.`)) {
          btn.disabled = true;
          try {
            await fetch(`/api/servers/${ActiveDetailServerId}/backups/${encodeURIComponent(fileName)}/restore`, { method: "POST" });
            alert("Backup restored successfully!");
            FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
          } catch {
            alert("Failed to restore backup");
          }
          btn.disabled = false;
        }
      } else if (action === "delete-backup") {
        if (confirm(`Delete backup '${fileName}'?`)) {
          btn.disabled = true;
          try {
            await fetch(`/api/servers/${ActiveDetailServerId}/backups/${encodeURIComponent(fileName)}`, { method: "DELETE" });
            FetchServerBackups(ActiveDetailServerId);
          } catch {
            alert("Failed to delete backup");
          }
        }
      }
    });
  }
}

function OpenCreateBackupModal() {
  Elements.CreateBackupForm.reset();
  const modal = GetBootstrapModal(Elements.CreateBackupModal);
  if (modal) modal.show();
}

async function HandleCreateBackupSubmit(e) {
  e.preventDefault();
  const name = Elements.BackupNameInput.value.trim();

  Elements.CreateBackupSubmitBtn.disabled = true;
  Elements.CreateBackupSubmitBtn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i> Archiving...`;

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Name: name }),
    });
    const json = await res.json();
    if (json.Success) {
      const modal = GetBootstrapModal(Elements.CreateBackupModal);
      if (modal) modal.hide();
      FetchServerBackups(ActiveDetailServerId);
    } else {
      alert("Backup creation failed: " + json.Error);
    }
  } catch {
    alert("Network error creating backup");
  } finally {
    Elements.CreateBackupSubmitBtn.disabled = false;
    Elements.CreateBackupSubmitBtn.innerHTML = `<i class="bi bi-box-arrow-down me-1"></i> Create Snapshot`;
  }
}

function RenderServerConfigTab() {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  if (!server) return;

  Elements.DetailEnvVarsContainer.innerHTML = "";
  const env = server.EnvironmentVariables || {};

  for (const [key, value] of Object.entries(env)) {
    AddEnvVarRow(key, value);
  }

  Elements.DetailAutoRestartSwitch.checked = server.AutoRestart !== false;

  const memLimit = server.Limits?.Memory || 0;
  Elements.DetailMemoryLimitSelect.value = String(memLimit);

  const cpuLimit = server.Limits?.CpuShares || 0;
  Elements.DetailCpuSharesSelect.value = String(cpuLimit);

  Elements.DetailPortsContainer.innerHTML = "";
  if (server.Ports && server.Ports.length > 0) {
    for (const p of server.Ports) {
      const pDiv = document.createElement("div");
      pDiv.className = "d-flex align-items-center justify-content-between p-2 rounded border mb-2 font-monospace small";
      pDiv.innerHTML = `
        <span>Host: <strong>${p.HostPort}</strong></span>
        <span>&rarr;</span>
        <span>Container: <strong>${p.ContainerPort}/${p.Protocol}</strong></span>
      `;
      Elements.DetailPortsContainer.appendChild(pDiv);
    }
  } else {
    Elements.DetailPortsContainer.innerHTML = `<span class="small text-body-secondary">No exposed ports configured.</span>`;
  }
}

function RenderServerNetworkingTab() {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  if (!server) return;

  const defaultSubdomain = `${server.Name.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.example.com`;
  if (!Elements.DetailSubdomainInput.value) {
    Elements.DetailSubdomainInput.value = defaultSubdomain;
  }

  UpdateCaddySnippet();

  const portsText =
    server.Ports && server.Ports.length > 0
      ? server.Ports.map((p) => `${p.HostPort} -> ${p.ContainerPort}/${p.Protocol}`).join("<br>")
      : "None";

  Elements.DetailNetworkInfoContainer.innerHTML = `
    <div class="mb-3">
      <span class="text-body-secondary small d-block mb-1">Bridge Gateway</span>
      <span class="font-monospace small">172.17.0.1</span>
    </div>
    <div class="mb-3">
      <span class="text-body-secondary small d-block mb-1">Forwarded Host Ports</span>
      <span class="font-monospace small">${portsText}</span>
    </div>
    <div class="mb-2">
      <span class="text-body-secondary small d-block mb-1">Caddy Direct Proxy Target</span>
      <span class="font-monospace small text-primary">127.0.0.1:${server.Ports?.[0]?.HostPort || "3000"}</span>
    </div>
  `;
}

function UpdateCaddySnippet() {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  const domain = Elements.DetailSubdomainInput.value.trim() || "subdomain.yourdomain.com";
  const port = server?.Ports?.[0]?.HostPort || 3000;

  Elements.DetailCaddySnippetPre.textContent = `${domain} {
    reverse_proxy 127.0.0.1:${port}
    encode gzip
}`;
}

async function FetchServerAuditLogs(serverId) {
  try {
    const res = await fetch(`/api/servers/${serverId}/audit`);
    const json = await res.json();
    if (json.Success) {
      RenderServerAuditLogsTable(json.Data);
    }
  } catch {
    Elements.DetailAuditTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load audit trail.</td></tr>`;
  }
}

function RenderServerAuditLogsTable(logs) {
  if (logs.length === 0) {
    Elements.DetailAuditTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-body-secondary">No audit logs recorded for this server yet.</td></tr>`;
    return;
  }

  Elements.DetailAuditTableBody.innerHTML = "";
  for (const log of logs) {
    const tr = document.createElement("tr");

    let actionBadgeClass = "text-bg-secondary";
    if (log.Action.includes("START")) actionBadgeClass = "text-bg-success";
    else if (log.Action.includes("STOP") || log.Action.includes("KILL")) actionBadgeClass = "text-bg-warning text-dark";
    else if (log.Action.includes("DELETE")) actionBadgeClass = "text-bg-danger";
    else if (log.Action.includes("CONFIG")) actionBadgeClass = "text-bg-info text-dark";

    tr.innerHTML = `
      <td class="ps-3 py-2"><span class="badge ${actionBadgeClass} font-monospace">${EscapeHtml(log.Action)}</span></td>
      <td class="small py-2">${EscapeHtml(log.Details)}</td>
      <td class="font-monospace small text-body-secondary py-2">${EscapeHtml(log.IpAddress)}</td>
      <td class="text-end pe-3 font-monospace small text-body-secondary py-2">${EscapeHtml(log.Timestamp.slice(0, 19).replace("T", " "))}</td>
    `;
    Elements.DetailAuditTableBody.appendChild(tr);
  }
}

function AddEnvVarRow(key = "", value = "") {
  const row = document.createElement("div");
  row.className = "d-flex align-items-center gap-2 EnvVarRow";
  row.innerHTML = `
    <input type="text" class="form-control form-control-sm font-monospace EnvVarKey" placeholder="KEY" value="${EscapeHtml(key)}" style="max-width: 200px;">
    <input type="text" class="form-control form-control-sm font-monospace EnvVarValue" placeholder="VALUE" value="${EscapeHtml(value)}">
    <button type="button" class="btn btn-ghost-danger btn-sm p-1 px-2 RemoveEnvVarBtn"><i class="bi bi-x-lg"></i></button>
  `;

  row.querySelector(".RemoveEnvVarBtn").addEventListener("click", () => {
    row.remove();
  });

  Elements.DetailEnvVarsContainer.appendChild(row);
}

async function HandleSaveServerConfig() {
  Elements.DetailSaveConfigBtn.disabled = true;
  Elements.DetailSaveConfigBtn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i> Saving...`;

  const rows = Elements.DetailEnvVarsContainer.querySelectorAll(".EnvVarRow");
  const env = {};
  for (const row of rows) {
    const k = row.querySelector(".EnvVarKey").value.trim();
    const v = row.querySelector(".EnvVarValue").value;
    if (k) env[k] = v;
  }

  const autoRestart = Elements.DetailAutoRestartSwitch.checked;
  const memLimit = Number(Elements.DetailMemoryLimitSelect.value) || 0;
  const cpuLimit = Number(Elements.DetailCpuSharesSelect.value) || 0;

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        EnvironmentVariables: env,
        AutoRestart: autoRestart,
        Limits: {
          Memory: memLimit,
          CpuShares: cpuLimit,
        },
      }),
    });
    const json = await res.json();
    if (json.Success) {
      Elements.DetailSaveConfigBtn.innerHTML = `<i class="bi bi-check2 me-1"></i> Saved!`;
      await FetchSingleServer(ActiveDetailServerId);
      setTimeout(() => {
        Elements.DetailSaveConfigBtn.innerHTML = `<i class="bi bi-check2 me-1"></i> Save Configuration & Limits`;
        Elements.DetailSaveConfigBtn.disabled = false;
      }, 1500);
    } else {
      alert("Failed to update config: " + json.Error);
      Elements.DetailSaveConfigBtn.disabled = false;
    }
  } catch {
    alert("Network error updating config.");
    Elements.DetailSaveConfigBtn.disabled = false;
  }
}

async function FetchServerInspect(serverId) {
  Elements.DetailDockerInspectPre.textContent = "Inspecting container metadata...";

  try {
    const res = await fetch(`/api/servers/${serverId}/inspect`);
    const json = await res.json();
    if (json.Success) {
      Elements.DetailDockerInspectPre.textContent = JSON.stringify(json.Data, null, 2);
    } else {
      Elements.DetailDockerInspectPre.textContent = `Inspect Error: ${json.Error || "Failed to inspect container"}`;
    }
  } catch {
    Elements.DetailDockerInspectPre.textContent = "Network error loading inspect data.";
  }
}

async function FetchUsers() {
  try {
    const res = await fetch("/api/users");
    if (res.status === 401) return;
    const json = await res.json();
    if (json.Success) {
      UsersList = json.Data;
      RenderUsersTable();
    }
  } catch {}
}

function RenderUsersTable() {
  Elements.NavUsersBadge.textContent = String(UsersList.length);
  Elements.UsersTotalCount.textContent = String(UsersList.length);

  const adminCount = UsersList.filter((u) => u.Role === "admin").length;
  const standardCount = UsersList.filter((u) => u.Role !== "admin").length;

  Elements.UsersAdminCount.textContent = String(adminCount);
  Elements.UsersStandardCount.textContent = String(standardCount);

  if (UsersList.length === 0) {
    Elements.UsersTableBody.innerHTML = `
      <tr><td colspan="5" class="text-center py-5 text-body-secondary">No user accounts found.</td></tr>
    `;
    return;
  }

  Elements.UsersTableBody.innerHTML = "";
  for (const user of UsersList) {
    const tr = document.createElement("tr");

    const roleBadge =
      user.Role === "admin"
        ? `<span class="badge text-bg-primary font-monospace">admin</span>`
        : `<span class="badge text-bg-secondary font-monospace">user</span>`;

    const isSelf = CurrentUser && CurrentUser.Id === user.Id;

    tr.innerHTML = `
      <td class="ps-3 py-2">
        <div class="fw-medium text-body">${EscapeHtml(user.Username)} ${isSelf ? `<span class="badge text-bg-dark border ms-1 small">You</span>` : ""}</div>
        <div class="small font-monospace text-body-tertiary" style="font-size: 0.72rem;">${EscapeHtml(user.Id)}</div>
      </td>
      <td class="py-2">${roleBadge}</td>
      <td class="py-2">
        <span class="badge text-bg-dark border font-monospace">${user.ServerCount || 0} instances</span>
      </td>
      <td class="small font-monospace text-body-secondary py-2">${EscapeHtml(user.CreatedAt || "-")}</td>
      <td class="text-end pe-3 py-2">
        <div class="d-inline-flex align-items-center gap-1">
          <button class="btn btn-sm btn-outline-secondary py-1 px-2" data-action="view-servers" data-id="${user.Id}" data-username="${EscapeHtml(user.Username)}" title="View Containers">
            <i class="bi bi-hdd-stack me-1"></i> Workloads
          </button>
          ${
            !isSelf
              ? `<button class="btn btn-ghost-danger py-1 px-2" data-action="delete-user" data-id="${user.Id}" title="Delete User"><i class="bi bi-trash"></i></button>`
              : ""
          }
        </div>
      </td>
    `;

    Elements.UsersTableBody.appendChild(tr);
  }

  const buttons = Elements.UsersTableBody.querySelectorAll("button[data-action]");
  for (const btn of buttons) {
    btn.addEventListener("click", async (e) => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const username = btn.dataset.username;

      if (action === "view-servers") {
        OpenUserWorkloadsModal(id, username);
      } else if (action === "delete-user") {
        if (confirm("Are you sure you want to delete this user? Their assigned containers will remain intact.")) {
          btn.disabled = true;
          await DeleteUser(id);
          await FetchUsers();
        }
      }
    });
  }
}

async function DeleteUser(userId) {
  try {
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
  } catch {}
}

async function OpenUserWorkloadsModal(userId, username) {
  Elements.UserWorkloadsModalUsername.textContent = username;
  Elements.UserWorkloadsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-body-secondary">Loading workloads...</td></tr>`;

  const modal = GetBootstrapModal(Elements.UserWorkloadsModal);
  if (modal) modal.show();

  try {
    const res = await fetch(`/api/users/${userId}/servers`);
    const json = await res.json();
    if (json.Success) {
      const servers = json.Data;
      if (servers.length === 0) {
        Elements.UserWorkloadsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-body-secondary">No containers assigned to this user.</td></tr>`;
        return;
      }

      Elements.UserWorkloadsTableBody.innerHTML = "";
      for (const s of servers) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="ps-3 py-2 fw-medium">${EscapeHtml(s.Name)}</td>
          <td class="py-2"><span class="badge text-bg-dark border font-monospace">${EscapeHtml(s.TemplateId)}</span></td>
          <td class="py-2"><span class="badge ${s.Status === "Running" ? "text-bg-success" : "text-bg-secondary"}">${s.Status}</span></td>
          <td class="text-end pe-3 py-2">
            <button class="btn btn-sm btn-outline-primary py-0 px-2" data-server-id="${s.Id}">Manage</button>
          </td>
        `;

        row.querySelector("button").addEventListener("click", () => {
          if (modal) modal.hide();
          OpenServerDetail(s.Id);
        });

        Elements.UserWorkloadsTableBody.appendChild(row);
      }
    }
  } catch {
    Elements.UserWorkloadsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Failed to fetch workloads.</td></tr>`;
  }
}

function OpenCreateUserModal() {
  Elements.CreateUserForm.reset();
  Elements.CreateUserErrorAlert.classList.add("d-none");
  const modal = GetBootstrapModal(Elements.CreateUserModal);
  if (modal) modal.show();
}

async function HandleCreateUserSubmit(e) {
  e.preventDefault();
  Elements.CreateUserErrorAlert.classList.add("d-none");

  const username = Elements.CreateUsernameInput.value.trim();
  const password = Elements.CreatePasswordInput.value;
  const role = Elements.CreateRoleSelect.value;

  Elements.CreateUserSubmitBtn.disabled = true;
  Elements.CreateUserSubmitBtn.textContent = "Creating...";

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Username: username, Password: password, Role: role }),
    });

    const json = await res.json();
    if (json.Success) {
      const modal = GetBootstrapModal(Elements.CreateUserModal);
      if (modal) modal.hide();
      await FetchUsers();
    } else {
      Elements.CreateUserErrorAlert.classList.remove("d-none");
      Elements.CreateUserErrorAlert.textContent = json.Error || "Failed to create user";
    }
  } catch {
    Elements.CreateUserErrorAlert.classList.remove("d-none");
    Elements.CreateUserErrorAlert.textContent = "Network error creating user";
  } finally {
    Elements.CreateUserSubmitBtn.disabled = false;
    Elements.CreateUserSubmitBtn.textContent = "Create Account";
  }
}

function OpenDeployModal() {
  const modal = GetBootstrapModal(Elements.DeployModal);
  if (modal) modal.show();
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
      OpenServerDetail(json.Data.Id);
    } else {
      alert("Deployment failed: " + JSON.stringify(json.Error));
    }
  } catch {
    alert("Network error deploying container");
  }
}

function FormatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

if (typeof window !== "undefined") {
  window.QiR = {
    OpenServerDetail,
    SwitchView,
    SwitchDetailTab,
    FetchServers,
    FetchUsers,
    FetchServerBackups,
    FetchServerAuditLogs,
  };
}