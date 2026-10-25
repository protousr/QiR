
function ShowToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("ToastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `qir-toast toast-type-${type} shadow-lg d-flex align-items-center gap-2 px-3 py-2 rounded-3 border`;
  const icon = type === "success" ? "bi-check-circle-fill text-success" :
               type === "error" ? "bi-exclamation-octagon-fill text-danger" :
               type === "warning" ? "bi-exclamation-triangle-fill text-warning" : "bi-info-circle-fill text-info";
  toast.innerHTML = `
    <i class="bi ${icon} fs-5"></i>
    <div class="small fw-medium flex-grow-1 text-truncate">${escapeHtml(String(message))}</div>
    <button type="button" class="btn-close btn-close-white btn-sm ms-2" aria-label="Close"></button>
  `;
  container.appendChild(toast);
  toast.querySelector(".btn-close").onclick = () => toast.remove();
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

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
let TerminalHistory = [];
let ActiveServerFilter = "all";
let DbPasswordMasked = true;
let EnvValuesMasked = true;
let HistoryPointer = -1;

const Elements = {
  ThemeSelectBtns: document.querySelectorAll(".ThemeSelectBtn"),
  ResourceMetricsCanvas: document.getElementById("ResourceMetricsCanvas"),
  ChartCpuLabel: document.getElementById("ChartCpuLabel"),
  ChartRamLabel: document.getElementById("ChartRamLabel"),
  DetailFilesCompressBtn: document.getElementById("DetailFilesCompressBtn"),
  EnvImportDotEnvBtn: document.getElementById("EnvImportDotEnvBtn"),
  BulkDotEnvModal: document.getElementById("BulkDotEnvModal"),
  BulkDotEnvTextarea: document.getElementById("BulkDotEnvTextarea"),
  BulkDotEnvApplyBtn: document.getElementById("BulkDotEnvApplyBtn"),
  DetailAlertWebhookInput: document.getElementById("DetailAlertWebhookInput"),
  DetailCrashCountBadge: document.getElementById("DetailCrashCountBadge"),
  DetailSaveAlertWebhookBtn: document.getElementById("DetailSaveAlertWebhookBtn"),
  DetailTestAlertWebhookBtn: document.getElementById("DetailTestAlertWebhookBtn"),
  DetailExportAuditCsvBtn: document.getElementById("DetailExportAuditCsvBtn"),
  DetailExportAuditJsonBtn: document.getElementById("DetailExportAuditJsonBtn"),
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
  DetailCloneBtn: document.getElementById("DetailCloneBtn"),
  BulkStartBtn: document.getElementById("BulkStartBtn"),
  BulkStopBtn: document.getElementById("BulkStopBtn"),
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
  DetailCaddyTargetPortSelect: document.getElementById("DetailCaddyTargetPortSelect"),
  DetailCaddySnippetPre: document.getElementById("DetailCaddySnippetPre"),
  DetailCopyCaddyBtn: document.getElementById("DetailCopyCaddyBtn"),
  DetailNetworkInfoContainer: document.getElementById("DetailNetworkInfoContainer"),

  DetailTabSchedules: document.getElementById("DetailTabSchedules"),
  DetailSchedulesCountBadge: document.getElementById("DetailSchedulesCountBadge"),
  DetailRefreshSchedulesBtn: document.getElementById("DetailRefreshSchedulesBtn"),
  OpenCreateScheduleModalBtn: document.getElementById("OpenCreateScheduleModalBtn"),
  DetailSchedulesTableBody: document.getElementById("DetailSchedulesTableBody"),

  DetailWebhookUrlInput: document.getElementById("DetailWebhookUrlInput"),
  DetailCopyWebhookBtn: document.getElementById("DetailCopyWebhookBtn"),
  DetailRotateWebhookBtn: document.getElementById("DetailRotateWebhookBtn"),
  OpenAddPortModalBtn: document.getElementById("OpenAddPortModalBtn"),

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
  DeployPortsListContainer: document.getElementById("DeployPortsListContainer"),
  DeployAddPortRowBtn: document.getElementById("DeployAddPortRowBtn"),
  DeployAutoRestartInput: document.getElementById("DeployAutoRestartInput"),

  AddPortModal: document.getElementById("AddPortModal"),
  AddPortForm: document.getElementById("AddPortForm"),
  AddHostPortInput: document.getElementById("AddHostPortInput"),
  AddContainerPortInput: document.getElementById("AddContainerPortInput"),
  AddPortProtocolSelect: document.getElementById("AddPortProtocolSelect"),

  CreateScheduleModal: document.getElementById("CreateScheduleModal"),
  CreateScheduleForm: document.getElementById("CreateScheduleForm"),
  ScheduleNameInput: document.getElementById("ScheduleNameInput"),
  ScheduleTaskTypeSelect: document.getElementById("ScheduleTaskTypeSelect"),
  ScheduleIntervalSelect: document.getElementById("ScheduleIntervalSelect"),
  ScheduleCommandContainer: document.getElementById("ScheduleCommandContainer"),
  ScheduleCommandInput: document.getElementById("ScheduleCommandInput"),

  CloneServerModal: document.getElementById("CloneServerModal"),
  CloneServerForm: document.getElementById("CloneServerForm"),
  CloneNameInput: document.getElementById("CloneNameInput"),

  TemplatesGrid: document.getElementById("TemplatesGrid"),
  HostInfoTableBody: document.getElementById("HostInfoTableBody"),
  DockerDiagTableBody: document.getElementById("DockerDiagTableBody"),
  DetailHealthBadge: document.getElementById("DetailHealthBadge"),
  DetailQuickExecBtn: document.getElementById("DetailQuickExecBtn"),
  ConsoleLogFilterInput: document.getElementById("ConsoleLogFilterInput"),
  ConsoleClearFilterBtn: document.getElementById("ConsoleClearFilterBtn"),
  DetailConsoleDownloadBtn: document.getElementById("DetailConsoleDownloadBtn"),
  DetailConsoleFullscreenBtn: document.getElementById("DetailConsoleFullscreenBtn"),
  DetailOpenInspectBtn: document.getElementById("DetailOpenInspectBtn"),
  DetailExportVolumeBtn: document.getElementById("DetailExportVolumeBtn"),
  FileEditorLangBadge: document.getElementById("FileEditorLangBadge"),
  FileEditorStatsBadge: document.getElementById("FileEditorStatsBadge"),
  FileEditorWrapBtn: document.getElementById("FileEditorWrapBtn"),
  FileEditorDownloadBtn: document.getElementById("FileEditorDownloadBtn"),
  FileEditorGutter: document.getElementById("FileEditorGutter"),
  FileEditorFooterStatus: document.getElementById("FileEditorFooterStatus"),
  InspectContainerModal: document.getElementById("InspectContainerModal"),
  InspectModalContainerIdLabel: document.getElementById("InspectModalContainerIdLabel"),
  InspectSearchInput: document.getElementById("InspectSearchInput"),
  InspectCopyJsonBtn: document.getElementById("InspectCopyJsonBtn"),
  InspectContainerJsonPre: document.getElementById("InspectContainerJsonPre"),
  QuickExecModal: document.getElementById("QuickExecModal"),
  QuickExecForm: document.getElementById("QuickExecForm"),
  QuickExecCommandInput: document.getElementById("QuickExecCommandInput"),
  QuickExecRunBtn: document.getElementById("QuickExecRunBtn"),
  QuickExecExitBadge: document.getElementById("QuickExecExitBadge"),
  QuickExecCopyBtn: document.getElementById("QuickExecCopyBtn"),
  QuickExecOutputPre: document.getElementById("QuickExecOutputPre"),
  RefreshDockerDiskUsageBtn: document.getElementById("RefreshDockerDiskUsageBtn"),
  DockerLayersSizeLabel: document.getElementById("DockerLayersSizeLabel"),
  DockerImagesCountLabel: document.getElementById("DockerImagesCountLabel"),
  DockerContainersCountLabel: document.getElementById("DockerContainersCountLabel"),
  DockerVolumesCountLabel: document.getElementById("DockerVolumesCountLabel"),
  DockerBuildCacheSizeLabel: document.getElementById("DockerBuildCacheSizeLabel"),
  PruneImagesBtn: document.getElementById("PruneImagesBtn"),
  PruneContainersBtn: document.getElementById("PruneContainersBtn"),
  PruneVolumesBtn: document.getElementById("PruneVolumesBtn"),
  PruneBuilderBtn: document.getElementById("PruneBuilderBtn"),
  PruneAllBtn: document.getElementById("PruneAllBtn"),
  BulkRestartBtn: document.getElementById("BulkRestartBtn"),
  FilesSearchInput: document.getElementById("FilesSearchInput"),
  EnvExportDotEnvBtn: document.getElementById("EnvExportDotEnvBtn"),
  DetailCurrentImageBadge: document.getElementById("DetailCurrentImageBadge"),
  DetailRedeployImageInput: document.getElementById("DetailRedeployImageInput"),
  DetailRedeployBtn: document.getElementById("DetailRedeployBtn"),
  DetailProcessesCountBadge: document.getElementById("DetailProcessesCountBadge"),
  DetailRefreshProcessesBtn: document.getElementById("DetailRefreshProcessesBtn"),
  DetailProcessesTableBody: document.getElementById("DetailProcessesTableBody"),
  ImagePreviewModal: document.getElementById("ImagePreviewModal"),
  ImagePreviewPathLabel: document.getElementById("ImagePreviewPathLabel"),
  ImagePreviewDimensionsBadge: document.getElementById("ImagePreviewDimensionsBadge"),
  ImagePreviewDownloadBtn: document.getElementById("ImagePreviewDownloadBtn"),
  ImagePreviewImg: document.getElementById("ImagePreviewImg"),
  GlobalAnnouncementBanner: document.getElementById("GlobalAnnouncementBanner"),
  GlobalAnnouncementIcon: document.getElementById("GlobalAnnouncementIcon"),
  GlobalAnnouncementText: document.getElementById("GlobalAnnouncementText"),
  GlobalAnnouncementCloseBtn: document.getElementById("GlobalAnnouncementCloseBtn"),
  SystemBannerStatusBadge: document.getElementById("SystemBannerStatusBadge"),
  SystemBannerEnableSwitch: document.getElementById("SystemBannerEnableSwitch"),
  SystemBannerTypeSelect: document.getElementById("SystemBannerTypeSelect"),
  SystemBannerTextInput: document.getElementById("SystemBannerTextInput"),
  SystemBannerSaveBtn: document.getElementById("SystemBannerSaveBtn"),
  DetailPauseBtn: document.getElementById("DetailPauseBtn"),
  DetailMemorySlider: document.getElementById("DetailMemorySlider"),
  DetailMemorySliderBadge: document.getElementById("DetailMemorySliderBadge"),
  DetailCpuSlider: document.getElementById("DetailCpuSlider"),
  DetailCpuSliderBadge: document.getElementById("DetailCpuSliderBadge"),
  DbConnectionTestBtn: document.getElementById("DbConnectionTestBtn"),
  DbConnectionTestResult: document.getElementById("DbConnectionTestResult"),
  DetailNetMetric: document.getElementById("DetailNetMetric"),
  EnvCloneSourceSelect: document.getElementById("EnvCloneSourceSelect"),
  EnvCloneApplyBtn: document.getElementById("EnvCloneApplyBtn"),
  DetailCopyComposeBtn: document.getElementById("DetailCopyComposeBtn"),
  DetailDownloadComposeBtn: document.getElementById("DetailDownloadComposeBtn"),
  DetailDockerComposePre: document.getElementById("DetailDockerComposePre"),
  FilesBatchBar: document.getElementById("FilesBatchBar"),
  FilesBatchCountBadge: document.getElementById("FilesBatchCountBadge"),
  FilesBatchDeleteBtn: document.getElementById("FilesBatchDeleteBtn"),
  FilesBatchCompressBtn: document.getElementById("FilesBatchCompressBtn"),
  FilesSelectAllCheckbox: document.getElementById("FilesSelectAllCheckbox"),
  DetailTagsContainer: document.getElementById("DetailTagsContainer"),
  DetailTagInput: document.getElementById("DetailTagInput"),
  DetailAddTagBtn: document.getElementById("DetailAddTagBtn"),
  DetailHealthcheckStatusBadge: document.getElementById("DetailHealthcheckStatusBadge"),
  DetailHealthcheckTableBody: document.getElementById("DetailHealthcheckTableBody"),
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
      const totpInput = document.getElementById("LoginTotpCode");
      const totpVal = totpInput && !document.getElementById("LoginTotpGroup").classList.contains("d-none") ? totpInput.value.trim() : undefined;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Username: Elements.LoginUsername.value.trim(),
          Password: Elements.LoginPassword.value,
          TotpCode: totpVal,
        }),
      });

      const json = await res.json();
      if (json.Success) {
        if (json.Data && json.Data.RequiresTotp) {
          document.getElementById("LoginTotpGroup").classList.remove("d-none");
          totpInput.focus();
          ShowToast("2FA required: Enter your 6-digit Authenticator code", "warning");
          return;
        }
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
    if (Templates.length === 0) {
      FetchTemplates().then(() => RenderTemplatesView());
    } else {
      RenderTemplatesView();
    }
  } else if (viewName === "System") {
    Elements.NavSystem.classList.add("active");
    Elements.SectionSystem.classList.remove("d-none");
    Elements.PageTitle.textContent = "System & Docker Diagnostics";
    FetchSystemStatus();
    FetchDockerDiskUsage();
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
  Elements.DetailTabSchedules.classList.toggle("d-none", tabName !== "Schedules");
  Elements.DetailTabActivity.classList.toggle("d-none", tabName !== "Activity");
  Elements.DetailTabDocker.classList.toggle("d-none", tabName !== "Docker");
  const envTab = document.getElementById("DetailTabEnvironment");
  if (envTab) envTab.classList.toggle("d-none", tabName !== "Environment");

  if (tabName === "Files") {
    FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
  } else if (tabName === "Backups") {
    FetchServerBackups(ActiveDetailServerId);
  } else if (tabName === "Docker") {
    FetchServerInspect(ActiveDetailServerId);
    FetchServerProcesses(ActiveDetailServerId);
    FetchServerDockerCompose(ActiveDetailServerId);
    const server = Servers.find((s) => s.Id === ActiveDetailServerId);
    if (server) RenderServerHealthcheck(server);
  } else if (tabName === "Config") {
    RenderServerConfigTab();
  } else if (tabName === "Networking") {
    RenderServerNetworkingTab();
  } else if (tabName === "Schedules") {
    FetchServerSchedules(ActiveDetailServerId);
  } else if (tabName === "Activity") {
    FetchServerAuditLogs(ActiveDetailServerId);
  } else if (tabName === "Environment") {
    RenderServerEnvironmentTab();
    PopulateEnvCloneDropdown();
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

  Elements.BulkStartBtn.addEventListener("click", async () => {
    Elements.BulkStartBtn.disabled = true;
    try {
      await fetch("/api/servers/bulk/start", { method: "POST" });
      await FetchServers();
    } finally {
      Elements.BulkStartBtn.disabled = false;
    }
  });

  Elements.BulkStopBtn.addEventListener("click", async () => {
    Elements.BulkStopBtn.disabled = true;
    try {
      await fetch("/api/servers/bulk/stop", { method: "POST" });
      await FetchServers();
    } finally {
      Elements.BulkStopBtn.disabled = false;
    }
  });

  Elements.DetailCloneBtn.addEventListener("click", () => {
    const server = Servers.find((s) => s.Id === ActiveDetailServerId);
    if (!server) return;
    Elements.CloneNameInput.value = `${server.Name}-clone`;
    const modal = GetBootstrapModal(Elements.CloneServerModal);
    if (modal) modal.show();
  });

  Elements.CloneServerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newName = Elements.CloneNameInput.value.trim();
    if (!newName) return;
    try {
      const res = await fetch(`/api/servers/${ActiveDetailServerId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ NewName: newName }),
      });
      const json = await res.json();
      if (json.Success) {
        const modal = GetBootstrapModal(Elements.CloneServerModal);
        if (modal) modal.hide();
        await FetchServers();
        OpenServerDetail(json.Data.Id);
      } else {
        ShowToast("Failed to clone server: " + json.Error, "error");
      }
    } catch {
      ShowToast("Network error cloning server", "error");
    }
  });

  Elements.OpenAddPortModalBtn.addEventListener("click", () => {
    Elements.AddPortForm.reset();
    const modal = GetBootstrapModal(Elements.AddPortModal);
    if (modal) modal.show();
  });

  Elements.AddPortForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const hostPort = Number(Elements.AddHostPortInput.value);
    const containerPort = Number(Elements.AddContainerPortInput.value);
    const protocol = Elements.AddPortProtocolSelect.value;
    try {
      const res = await fetch(`/api/servers/${ActiveDetailServerId}/ports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ HostPort: hostPort, ContainerPort: containerPort, Protocol: protocol }),
      });
      const json = await res.json();
      if (json.Success) {
        const modal = GetBootstrapModal(Elements.AddPortModal);
        if (modal) modal.hide();
        await FetchServers();
        RenderServerConfigTab();
      } else {
        ShowToast("Failed to add port: " + json.Error, "error");
      }
    } catch {
      ShowToast("Network error adding port", "error");
    }
  });

  Elements.DetailRotateWebhookBtn.addEventListener("click", async () => {
    if (!confirm("Rotate deploy webhook secret? Existing URLs in CI/CD pipelines will stop working.")) return;
    try {
      const res = await fetch(`/api/servers/${ActiveDetailServerId}/webhook/rotate`, { method: "POST" });
      const json = await res.json();
      if (json.Success) {
        Elements.DetailWebhookUrlInput.value = `${window.location.origin}${json.Data.WebhookUrl}`;
      }
    } catch {}
  });

  Elements.DetailCopyWebhookBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(Elements.DetailWebhookUrlInput.value);
    Elements.DetailCopyWebhookBtn.innerHTML = `<i class="bi bi-check2"></i>`;
    setTimeout(() => {
      Elements.DetailCopyWebhookBtn.innerHTML = `<i class="bi bi-clipboard"></i>`;
    }, 2000);
  });

  Elements.DetailCaddyTargetPortSelect.addEventListener("change", UpdateCaddySnippet);

  Elements.OpenCreateScheduleModalBtn.addEventListener("click", () => {
    Elements.CreateScheduleForm.reset();
    Elements.ScheduleCommandContainer.classList.add("d-none");
    const modal = GetBootstrapModal(Elements.CreateScheduleModal);
    if (modal) modal.show();
  });

  Elements.ScheduleTaskTypeSelect.addEventListener("change", () => {
    Elements.ScheduleCommandContainer.classList.toggle(
      "d-none",
      Elements.ScheduleTaskTypeSelect.value !== "Command"
    );
  });

  Elements.DetailRefreshSchedulesBtn.addEventListener("click", () => {
    FetchServerSchedules(ActiveDetailServerId);
  });

  Elements.CreateScheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = Elements.ScheduleNameInput.value.trim();
    const taskType = Elements.ScheduleTaskTypeSelect.value;
    const interval = Number(Elements.ScheduleIntervalSelect.value);
    const cmd = Elements.ScheduleCommandInput.value.trim();
    try {
      const res = await fetch(`/api/servers/${ActiveDetailServerId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: name,
          TaskType: taskType,
          IntervalMinutes: interval,
          Command: taskType === "Command" ? cmd : undefined,
        }),
      });
      const json = await res.json();
      if (json.Success) {
        const modal = GetBootstrapModal(Elements.CreateScheduleModal);
        if (modal) modal.hide();
        FetchServerSchedules(ActiveDetailServerId);
      } else {
        ShowToast("Failed to create task: " + json.Error, "error");
      }
    } catch {
      ShowToast("Network error creating task", "error");
    }
  });

  Elements.DeployAddPortRowBtn.addEventListener("click", () => {
    AddDeployPortRow("", "", "tcp");
  });

  document.querySelectorAll(".QuickCmdBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      if (cmd && ConsoleSocket && ConsoleSocket.readyState === WebSocket.OPEN) {
        ConsoleSocket.send(JSON.stringify({ Command: cmd }));
      }
    });
  });

  Elements.DetailTerminalInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      if (TerminalHistory.length === 0) return;
      if (HistoryPointer === -1) {
        HistoryPointer = TerminalHistory.length - 1;
      } else if (HistoryPointer > 0) {
        HistoryPointer--;
      }
      Elements.DetailTerminalInput.value = TerminalHistory[HistoryPointer];
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (HistoryPointer === -1) return;
      if (HistoryPointer < TerminalHistory.length - 1) {
        HistoryPointer++;
        Elements.DetailTerminalInput.value = TerminalHistory[HistoryPointer];
      } else {
        HistoryPointer = -1;
        Elements.DetailTerminalInput.value = "";
      }
      e.preventDefault();
    }
  });
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
      FetchAnnouncementBanner();
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

async function FetchAnnouncementBanner() {
  try {
    const res = await fetch("/api/system/banner");
    const json = await res.json();
    if (json.Success && json.Data) {
      const banner = json.Data;
      if (Elements.SystemBannerEnableSwitch) {
        Elements.SystemBannerEnableSwitch.checked = Boolean(banner.Enabled);
      }
      if (Elements.SystemBannerTypeSelect) {
        Elements.SystemBannerTypeSelect.value = banner.Type || "info";
      }
      if (Elements.SystemBannerTextInput) {
        Elements.SystemBannerTextInput.value = banner.Message || "";
      }
      if (Elements.SystemBannerStatusBadge) {
        Elements.SystemBannerStatusBadge.textContent = banner.Enabled ? "Active Broadcast" : "Disabled";
        Elements.SystemBannerStatusBadge.className = `badge ${banner.Enabled ? "text-bg-success" : "bg-secondary-subtle text-secondary"}`;
      }

      if (banner.Enabled && banner.Message && !sessionStorage.getItem("qir_banner_dismissed")) {
        Elements.GlobalAnnouncementText.textContent = banner.Message;
        Elements.GlobalAnnouncementBanner.className = `alert alert-${banner.Type} d-flex align-items-center justify-content-between py-2 px-3 mb-4 shadow-sm rounded border-0`;
        let iconClass = "bi-info-circle-fill";
        if (banner.Type === "warning") iconClass = "bi-exclamation-triangle-fill";
        else if (banner.Type === "danger") iconClass = "bi-exclamation-octagon-fill";
        else if (banner.Type === "success") iconClass = "bi-check-circle-fill";
        Elements.GlobalAnnouncementIcon.className = `bi ${iconClass} fs-5`;
        Elements.GlobalAnnouncementBanner.classList.remove("d-none");
      } else {
        Elements.GlobalAnnouncementBanner.classList.add("d-none");
      }
    }
  } catch {}
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
      RenderTemplatesView();
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

function AddDeployPortRow(hostPort = "", containerPort = "", protocol = "tcp") {
  const row = document.createElement("div");
  row.className = "d-flex align-items-center gap-2 mb-2 DeployPortRow";
  row.innerHTML = `
    <input type="number" class="form-control form-control-sm font-monospace DeployRowHostPort" placeholder="Host Port" value="${hostPort}" required style="width: 40%;">
    <span class="small text-body-secondary">&rarr;</span>
    <input type="number" class="form-control form-control-sm font-monospace DeployRowContainerPort" placeholder="Container Port" value="${containerPort}" required style="width: 35%;">
    <select class="form-select form-select-sm font-monospace DeployRowProtocol" style="width: 25%;">
      <option value="tcp" ${protocol === "tcp" ? "selected" : ""}>TCP</option>
      <option value="udp" ${protocol === "udp" ? "selected" : ""}>UDP</option>
    </select>
    <button type="button" class="btn btn-xs btn-outline-danger RemoveDeployPortBtn">
      <i class="bi bi-x-lg"></i>
    </button>
  `;
  row.querySelector(".RemoveDeployPortBtn").addEventListener("click", () => row.remove());
  Elements.DeployPortsListContainer.appendChild(row);
}

function HandleTemplateSelectionChange() {
  const selectedId = Elements.DeployTemplateSelect.value;
  const template = Templates.find((t) => t.Id === selectedId);
  if (!template) return;

  Elements.DeployTemplateDescAlert.classList.remove("d-none");
  Elements.DeployTemplateDescAlert.textContent = template.Description;

  Elements.DeployPortsListContainer.innerHTML = "";
  if (template.DefaultPorts && template.DefaultPorts.length > 0) {
    for (const p of template.DefaultPorts) {
      AddDeployPortRow(p.HostPort, p.ContainerPort, p.Protocol || "tcp");
    }
  } else {
    AddDeployPortRow(3000, 3000, "tcp");
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
  const chipAll = document.getElementById("ChipCountAll");
  const chipRun = document.getElementById("ChipCountRunning");
  const chipStop = document.getElementById("ChipCountStopped");
  if (chipAll) chipAll.textContent = String(Servers.length);
  if (chipRun) chipRun.textContent = String(runningCount);
  if (chipStop) chipStop.textContent = String(stoppedCount);

  let filtered = Servers;
  if (ActiveServerFilter === "running") {
    filtered = filtered.filter((s) => s.Status === "Running");
  } else if (ActiveServerFilter === "stopped") {
    filtered = filtered.filter((s) => s.Status !== "Running");
  } else if (ActiveServerFilter === "databases") {
    filtered = filtered.filter((s) => (s.TemplateId.includes("db") || s.TemplateId.includes("cache")));
  } else if (ActiveServerFilter === "minecraft") {
    filtered = filtered.filter((s) => s.TemplateId.includes("minecraft"));
  } else if (ActiveServerFilter === "bots") {
    filtered = filtered.filter((s) => s.TemplateId.includes("bot"));
  }

  if (filterText) {
    filtered = filtered.filter(
      (s) =>
        s.Name.toLowerCase().includes(filterText) ||
        s.TemplateId.toLowerCase().includes(filterText) ||
        s.ContainerId.toLowerCase().includes(filterText) ||
        (s.Ports && s.Ports.some((p) => String(p.HostPort).includes(filterText) || String(p.ContainerPort).includes(filterText)))
    );
  }

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

    let statusBadgeHtml = `<span class="badge text-bg-secondary">${server.Status}</span>`;
    if (server.Status === "Running") {
      statusBadgeHtml = `<span class="badge text-bg-success">Running</span>`;
    } else if (server.Status === "Paused") {
      statusBadgeHtml = `<span class="badge text-bg-warning text-dark"><i class="bi bi-pause-circle me-1"></i>Paused</span>`;
    } else if (server.Status === "Starting" || server.Status === "Restarting") {
      statusBadgeHtml = `<span class="badge text-bg-warning text-dark">${server.Status}</span>`;
    } else if (server.Status === "Stopped") {
      if (server.OomKilled) {
        statusBadgeHtml = `<span class="badge text-bg-danger"><i class="bi bi-exclamation-octagon me-1"></i>OOM Killed (137)</span>`;
      } else if (server.ExitCode && server.ExitCode !== 0) {
        statusBadgeHtml = `<span class="badge text-bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>Exited (${server.ExitCode})</span>`;
      } else {
        statusBadgeHtml = `<span class="badge text-bg-secondary">Stopped</span>`;
      }
    } else if (server.Status === "Error") {
      statusBadgeHtml = `<span class="badge text-bg-danger">Error</span>`;
    }

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
        ${server.Tags && server.Tags.length > 0 ? `<div class="d-flex flex-wrap gap-1 mt-1">${server.Tags.map((t) => `<span class="badge bg-secondary-subtle text-secondary font-monospace" style="font-size: 0.65rem;">#${EscapeHtml(t)}</span>`).join("")}</div>` : ""}
      </td>
      <td>
        <span class="badge text-bg-dark border font-monospace">${EscapeHtml(templateLabel)}</span>
      </td>
      <td>
        ${statusBadgeHtml}
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
  if (Elements.DetailCurrentImageBadge) {
    Elements.DetailCurrentImageBadge.textContent = server.Image || "default";
  }

  if (server.Status === "Running") {
    Elements.DetailStatusBadge.className = "badge text-bg-success";
    Elements.DetailStatusBadge.innerHTML = `<i class="bi bi-play-circle-fill me-1"></i> Running`;
  } else if (server.Status === "Paused") {
    Elements.DetailStatusBadge.className = "badge text-bg-warning text-dark";
    Elements.DetailStatusBadge.innerHTML = `<i class="bi bi-pause-circle me-1"></i> Paused`;
  } else if (server.Status === "Starting" || server.Status === "Restarting") {
    Elements.DetailStatusBadge.className = "badge text-bg-warning text-dark";
    Elements.DetailStatusBadge.textContent = server.Status;
  } else if (server.Status === "Stopped") {
    if (server.OomKilled) {
      Elements.DetailStatusBadge.className = "badge text-bg-danger";
      Elements.DetailStatusBadge.innerHTML = `<i class="bi bi-exclamation-octagon me-1"></i> OOM Killed (137)`;
    } else if (server.ExitCode && server.ExitCode !== 0) {
      Elements.DetailStatusBadge.className = "badge text-bg-warning text-dark";
      Elements.DetailStatusBadge.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> Exited (${server.ExitCode})`;
    } else {
      Elements.DetailStatusBadge.className = "badge text-bg-secondary";
      Elements.DetailStatusBadge.textContent = "Stopped";
    }
  } else if (server.Status === "Error") {
    Elements.DetailStatusBadge.className = "badge text-bg-danger";
    Elements.DetailStatusBadge.textContent = "Error";
  }

  if (Elements.DetailPauseBtn) {
    if (server.Status === "Paused") {
      Elements.DetailPauseBtn.innerHTML = `<i class="bi bi-play-circle-fill me-1"></i> Resume`;
      Elements.DetailPauseBtn.className = "btn btn-sm btn-outline-success";
      Elements.DetailPauseBtn.disabled = false;
    } else {
      Elements.DetailPauseBtn.innerHTML = `<i class="bi bi-pause-fill me-1"></i> Pause`;
      Elements.DetailPauseBtn.className = "btn btn-sm btn-outline-warning";
      Elements.DetailPauseBtn.disabled = server.Status !== "Running";
    }
  }

  const oomBadge = document.getElementById("DetailOomBadge");
  if (oomBadge) {
    oomBadge.classList.toggle("d-none", !server.OomKilled);
  }

  const healthBadge = document.getElementById("DetailHealthBadge");
  if (healthBadge) {
    if (server.HealthStatus && server.HealthStatus !== "none") {
      healthBadge.classList.remove("d-none");
      if (server.HealthStatus === "healthy") {
        healthBadge.className = "badge text-bg-success ms-1";
        healthBadge.innerHTML = `<i class="bi bi-heart-pulse-fill me-1"></i> Healthy`;
      } else if (server.HealthStatus === "starting") {
        healthBadge.className = "badge text-bg-warning text-dark ms-1";
        healthBadge.innerHTML = `<i class="bi bi-hourglass-split me-1"></i> Healthcheck Starting`;
      } else {
        healthBadge.className = "badge text-bg-danger ms-1";
        healthBadge.innerHTML = `<i class="bi bi-heart-pulse-fill me-1"></i> Unhealthy`;
      }
    } else {
      healthBadge.classList.add("d-none");
    }
  }

  const dbCard = document.getElementById("DbConnectionCard");
  if (dbCard) {
    const isDb = (server.TemplateId.includes("mariadb") || server.TemplateId.includes("postgresql") || server.TemplateId.includes("mongo") || server.TemplateId.includes("redis"));
    dbCard.classList.toggle("d-none", !isDb);
    if (isDb) {
      UpdateDbConnectionCard(server);
    }
  }

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
        MetricsHistory.push({ cpu: cpuPct, mem: memPct });
        if (MetricsHistory.length > 35) MetricsHistory.shift();
        if (Elements.ChartCpuLabel) Elements.ChartCpuLabel.textContent = `${cpuPct.toFixed(1)}%`;
        if (Elements.ChartRamLabel) Elements.ChartRamLabel.textContent = `${memPct.toFixed(1)}% (${memMb} MB)`;
        DrawResourceChart();

        if (Elements.DetailNetMetric) {
          const rxMb = ((stats.NetworkInputBytes || 0) / (1024 * 1024)).toFixed(2);
          const txMb = ((stats.NetworkOutputBytes || 0) / (1024 * 1024)).toFixed(2);
          Elements.DetailNetMetric.textContent = `⬇ ${rxMb}M / ⬆ ${txMb}M`;
        }

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

  const line = document.createElement("div");
  line.className = "terminal-line";
  line.innerHTML = `<span class="text-primary fw-bold">&gt;</span> <span class="text-white">${EscapeHtml(cmd)}</span>`;
  Elements.DetailTerminalOutput.appendChild(line);
  ScrollTerminalToBottom();

  ConsoleSocket.send(JSON.stringify({ Command: cmd }));
  TerminalHistory.push(cmd);
  HistoryPointer = -1;
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
  if (Elements.FilesSelectAllCheckbox) Elements.FilesSelectAllCheckbox.checked = false;
  if (Elements.FilesBatchBar) {
    Elements.FilesBatchBar.classList.add("d-none");
    Elements.FilesBatchBar.classList.remove("d-flex");
  }

  if (ActiveDetailSubPath) {
    const trUp = document.createElement("tr");
    trUp.innerHTML = `
      <td colspan="5" class="ps-3 py-2">
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
      <td colspan="5" class="text-center py-4 text-body-secondary">
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
      <td class="ps-3 py-2" style="width: 38px;">
        <input type="checkbox" class="form-check-input FileRowCheckbox" data-path="${EscapeHtml(relativePath)}">
      </td>
      <td class="py-2">
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
                ${/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(item.Name) ? `<button class="btn btn-ghost py-1 px-2 text-info" data-action="preview-image" data-path="${EscapeHtml(relativePath)}" data-name="${EscapeHtml(item.Name)}" title="Preview Image"><i class="bi bi-eye"></i></button>` : `<button class="btn btn-ghost py-1 px-2" data-action="edit-file" data-path="${EscapeHtml(relativePath)}" title="Edit File"><i class="bi bi-pencil"></i></button>`}
                <a href="/api/servers/${ActiveDetailServerId}/files/download?FilePath=${encodeURIComponent(relativePath)}" class="btn btn-ghost py-1 px-2" title="Download File"><i class="bi bi-download"></i></a>
              `
              : ""
          }
          
          ${
            !item.IsDirectory && /\.(zip|tar\.gz|tar|tgz)$/i.test(item.Name)
              ? `<button class="btn btn-ghost py-1 px-2 text-warning" data-action="extract-file" data-path="${EscapeHtml(relativePath)}" title="Extract Archive"><i class="bi bi-file-earmark-zip"></i></button>`
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
      } else if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(itemPath)) {
        OpenImagePreview(itemPath, itemPath.split("/").pop());
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

      if (action === "preview-image") {
        OpenImagePreview(filePath, btn.dataset.name || filePath.split("/").pop());
      } else if (action === "edit-file") {
        OpenFileEditor(ActiveDetailServerId, filePath);
      
      } else if (action === "extract-file") {
        if (confirm(`Extract archive '${filePath}' to current directory?`)) {
          btn.disabled = true;
          try {
            const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/extract`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ArchivePath: filePath, Destination: ActiveDetailSubPath || "" }),
            });
            const json = await res.json();
            if (json.Success) {
              ShowToast("Archive extracted successfully!", "success");
              FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
            } else {
              ShowToast("Extraction failed: " + json.Error, "error");
            }
          } catch {
            ShowToast("Network error extracting archive", "error");
          } finally {
            btn.disabled = false;
          }
        }
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

  const checkboxes = Elements.DetailFilesTableBody.querySelectorAll(".FileRowCheckbox");
  for (const cb of checkboxes) {
    cb.addEventListener("change", UpdateFilesBatchState);
  }
}

function UpdateFilesBatchState() {
  if (!Elements.FilesBatchBar) return;
  const checked = Elements.DetailFilesTableBody.querySelectorAll(".FileRowCheckbox:checked");
  const count = checked.length;
  if (count > 0) {
    Elements.FilesBatchBar.classList.remove("d-none");
    Elements.FilesBatchBar.classList.add("d-flex");
    if (Elements.FilesBatchCountBadge) {
      Elements.FilesBatchCountBadge.textContent = `${count} selected`;
    }
  } else {
    Elements.FilesBatchBar.classList.add("d-none");
    Elements.FilesBatchBar.classList.remove("d-flex");
  }
}

function DetectFileLanguage(fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "json": return "JSON";
    case "js": case "mjs": case "cjs": return "JAVASCRIPT";
    case "ts": return "TYPESCRIPT";
    case "py": return "PYTHON";
    case "html": return "HTML";
    case "css": return "CSS";
    case "env": return "ENV";
    case "yaml": case "yml": return "YAML";
    case "sql": return "SQL";
    case "sh": case "bash": return "BASH";
    case "md": return "MARKDOWN";
    case "dockerfile": return "DOCKER";
    default: return "TEXT";
  }
}

function UpdateEditorGutter() {
  if (!Elements.FileEditorTextarea || !Elements.FileEditorGutter) return;
  const val = Elements.FileEditorTextarea.value;
  const lineCount = val.split("\n").length;
  let gutterHtml = "";
  for (let i = 1; i <= lineCount; i++) {
    gutterHtml += `${i}<br>`;
  }
  Elements.FileEditorGutter.innerHTML = gutterHtml;
  if (Elements.FileEditorStatsBadge) {
    Elements.FileEditorStatsBadge.textContent = `${lineCount} lines (${(new Blob([val]).size / 1024).toFixed(1)} KB)`;
  }
}

async function OpenFileEditor(serverId, filePath) {
  ActiveEditFilePath = filePath;
  Elements.FileEditorPathLabel.textContent = `/${filePath}`;
  if (Elements.FileEditorLangBadge) {
    Elements.FileEditorLangBadge.textContent = DetectFileLanguage(filePath);
  }
  Elements.FileEditorTextarea.value = "Loading file content...";
  UpdateEditorGutter();

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
  UpdateEditorGutter();
  if (Elements.FileEditorFooterStatus) {
    Elements.FileEditorFooterStatus.textContent = "UTF-8 | Ready | Press Ctrl+S to save";
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
      ShowToast("Save failed: " + (json.Error || "Unknown error"), "error");
      Elements.FileEditorSaveBtn.disabled = false;
    }
  } catch {
    ShowToast("Network error saving file.", "error");
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
      ShowToast("Failed to create file: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error creating file", "error");
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
      ShowToast("Failed to create directory: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error creating directory", "error");
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
      ShowToast("Failed to rename: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error renaming item", "error");
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
        ShowToast("Upload failed: " + json.Error, "error");
      }
    } catch {
      ShowToast("Network error uploading file", "error");
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
            ShowToast("Backup restored successfully!", "success");
            FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
          } catch {
            ShowToast("Failed to restore backup", "error");
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
            ShowToast("Failed to delete backup", "error");
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
      ShowToast("Backup creation failed: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error creating backup", "error");
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
  if (Elements.DetailMemorySlider) {
    Elements.DetailMemorySlider.value = String(memLimit);
    UpdateMemorySliderLabel(memLimit);
  }

  const cpuLimit = server.Limits?.CpuShares || 0;
  Elements.DetailCpuSharesSelect.value = String(cpuLimit);
  if (Elements.DetailCpuSlider) {
    Elements.DetailCpuSlider.value = String(cpuLimit);
    UpdateCpuSliderLabel(cpuLimit);
  }

  Elements.DetailPortsContainer.innerHTML = "";
  if (server.Ports && server.Ports.length > 0) {
    for (const p of server.Ports) {
      const pDiv = document.createElement("div");
      pDiv.className = "d-flex align-items-center justify-content-between p-2 rounded border mb-2 font-monospace small";
      pDiv.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <span>Host: <strong class="text-primary">${p.HostPort}</strong></span>
          <span class="mx-1">&rarr;</span>
          <span>Container: <strong>${p.ContainerPort}/${p.Protocol}</strong></span>
          <span class="PortProbeResult font-monospace small" id="PortProbeResult_${p.HostPort}"></span>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button class="btn btn-xs btn-outline-info PortProbeBtn" data-port="${p.HostPort}" title="Test TCP connectivity">
            <i class="bi bi-activity me-1"></i> Probe
          </button>
          <button class="btn btn-xs btn-outline-danger DeletePortBtn" data-cport="${p.ContainerPort}" data-proto="${p.Protocol}" title="Remove port mapping">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      Elements.DetailPortsContainer.appendChild(pDiv);
    }

    Elements.DetailPortsContainer.querySelectorAll(".PortProbeBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const port = btn.dataset.port;
        const resEl = document.getElementById(`PortProbeResult_${port}`);
        if (resEl) resEl.innerHTML = `<span class="badge text-bg-secondary"><i class="bi bi-hourglass-split me-1"></i>Testing...</span>`;
        btn.disabled = true;
        try {
          const res = await fetch(`/api/servers/${ActiveDetailServerId}/ports/probe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Port: Number(port) }),
          });
          const json = await res.json();
          if (json.Success && json.Data.Reachable) {
            if (resEl) resEl.innerHTML = `<span class="badge text-bg-success"><i class="bi bi-check-circle-fill me-1"></i>${json.Data.LatencyMs}ms Reachable</span>`;
          } else {
            if (resEl) resEl.innerHTML = `<span class="badge text-bg-danger"><i class="bi bi-x-circle-fill me-1"></i>${json.Data?.Error || "Refused"}</span>`;
          }
        } catch {
          if (resEl) resEl.innerHTML = `<span class="badge text-bg-danger"><i class="bi bi-x-circle-fill me-1"></i>Probe Error</span>`;
        } finally {
          btn.disabled = false;
        }
      });
    });

    Elements.DetailPortsContainer.querySelectorAll(".DeletePortBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cport = btn.dataset.cport;
        const proto = btn.dataset.proto;
        if (!confirm(`Remove port mapping ${cport}/${proto}? The container will be updated.`)) return;
        try {
          const res = await fetch(`/api/servers/${ActiveDetailServerId}/ports/${cport}/${proto}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (json.Success) {
            await FetchServers();
            RenderServerConfigTab();
          } else {
            ShowToast("Failed to remove port: " + json.Error, "error");
          }
        } catch {
          ShowToast("Network error removing port", "error");
        }
      });
    });
  } else {
    Elements.DetailPortsContainer.innerHTML = `<span class="small text-body-secondary">No exposed ports configured.</span>`;
  }

  FetchServerWebhook(server.Id);
  RenderServerTags(server);
}

async function FetchServerWebhook(serverId) {
  try {
    const res = await fetch(`/api/servers/${serverId}/webhook`);
    const json = await res.json();
    if (json.Success) {
      Elements.DetailWebhookUrlInput.value = `${window.location.origin}${json.Data.WebhookUrl}`;
    }
  } catch {}
}

function RenderServerNetworkingTab() {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  if (!server) return;

  const defaultSubdomain = `${server.Name.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.example.com`;
  if (!Elements.DetailSubdomainInput.value) {
    Elements.DetailSubdomainInput.value = defaultSubdomain;
  }

  Elements.DetailCaddyTargetPortSelect.innerHTML = "";
  if (server.Ports && server.Ports.length > 0) {
    for (const p of server.Ports) {
      const opt = document.createElement("option");
      opt.value = p.HostPort;
      opt.textContent = `Host ${p.HostPort} (${p.ContainerPort}/${p.Protocol})`;
      Elements.DetailCaddyTargetPortSelect.appendChild(opt);
    }
  } else {
    const opt = document.createElement("option");
    opt.value = "3000";
    opt.textContent = "Host 3000";
    Elements.DetailCaddyTargetPortSelect.appendChild(opt);
  }

  UpdateCaddySnippet();

  const portsText =
    server.Ports && server.Ports.length > 0
      ? server.Ports.map((p) => `${p.HostPort} -> ${p.ContainerPort}/${p.Protocol}`).join("<br>")
      : "None";

  const targetHostPort = Elements.DetailCaddyTargetPortSelect.value || server?.Ports?.[0]?.HostPort || "3000";

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
      <span class="font-monospace small text-primary">127.0.0.1:${targetHostPort}</span>
    </div>
  `;
}

function UpdateCaddySnippet() {
  const domain = Elements.DetailSubdomainInput.value.trim() || "subdomain.yourdomain.com";
  const port = Elements.DetailCaddyTargetPortSelect?.value || 3000;

  Elements.DetailCaddySnippetPre.textContent = `${domain} {
    reverse_proxy 127.0.0.1:${port}
    encode gzip
}`;
}

async function FetchServerSchedules(serverId) {
  try {
    const res = await fetch(`/api/servers/${serverId}/schedules`);
    const json = await res.json();
    if (json.Success) {
      RenderServerSchedulesTable(json.Data);
    }
  } catch {
    Elements.DetailSchedulesTableBody.innerHTML = `
      <tr><td colspan="6" class="text-center py-4 text-danger">Failed to load automated tasks.</td></tr>
    `;
  }
}

function RenderServerSchedulesTable(schedules) {
  Elements.DetailSchedulesCountBadge.textContent = `${schedules?.length || 0} tasks`;
  Elements.DetailSchedulesTableBody.innerHTML = "";
  if (!schedules || schedules.length === 0) {
    Elements.DetailSchedulesTableBody.innerHTML = `
      <tr><td colspan="6" class="text-center py-4 text-body-secondary">No automated tasks configured yet.</td></tr>
    `;
    return;
  }

  for (const s of schedules) {
    const tr = document.createElement("tr");
    const badgeColor = s.TaskType === "Backup" ? "info" : s.TaskType === "Restart" ? "warning" : "primary";
    const nextFormatted = new Date(s.NextRun).toLocaleString();
    const lastFormatted = s.LastRun ? new Date(s.LastRun).toLocaleString() : "Never";

    tr.innerHTML = `
      <td class="ps-3 py-2 fw-medium">${EscapeHtml(s.Name)}</td>
      <td class="py-2"><span class="badge text-bg-${badgeColor}">${s.TaskType}</span></td>
      <td class="py-2 small font-monospace">Every ${s.IntervalMinutes}m</td>
      <td class="py-2 small font-monospace">${nextFormatted}</td>
      <td class="py-2 small font-monospace">${lastFormatted}</td>
      <td class="py-2 text-end pe-3">
        <button class="btn btn-xs btn-outline-success me-1 RunScheduleBtn" data-id="${s.Id}" title="Trigger Now">
          <i class="bi bi-play-fill"></i>
        </button>
        <button class="btn btn-xs btn-outline-danger DeleteScheduleBtn" data-id="${s.Id}" title="Delete Task">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    Elements.DetailSchedulesTableBody.appendChild(tr);
  }

  Elements.DetailSchedulesTableBody.querySelectorAll(".RunScheduleBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await fetch(`/api/servers/${ActiveDetailServerId}/schedules/${btn.dataset.id}/run`, { method: "POST" });
        await FetchServerSchedules(ActiveDetailServerId);
      } finally {
        btn.disabled = false;
      }
    });
  });

  Elements.DetailSchedulesTableBody.querySelectorAll(".DeleteScheduleBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this automated task?")) return;
      try {
        await fetch(`/api/servers/${ActiveDetailServerId}/schedules/${btn.dataset.id}`, { method: "DELETE" });
        await FetchServerSchedules(ActiveDetailServerId);
      } catch {}
    });
  });
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
      ShowToast("Failed to update config: " + json.Error, "error");
      Elements.DetailSaveConfigBtn.disabled = false;
    }
  } catch {
    ShowToast("Network error updating config.", "error");
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
  const portRows = Elements.DeployPortsListContainer.querySelectorAll(".DeployPortRow");
  for (const r of portRows) {
    const hp = Number(r.querySelector(".DeployRowHostPort")?.value);
    const cp = Number(r.querySelector(".DeployRowContainerPort")?.value);
    const proto = r.querySelector(".DeployRowProtocol")?.value || "tcp";
    if (hp && cp) {
      ports.push({ HostPort: hp, ContainerPort: cp, Protocol: proto });
    }
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
      ShowToast("Deployment failed: " + JSON.stringify(json.Error), "error");
    }
  } catch {
    ShowToast("Network error deploying container", "error");
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
    FetchServerSchedules,
    DrawResourceChart,
    FetchDockerDiskUsage,
    OpenDockerInspectModal,
    OpenQuickExecModal,
    OpenFileEditor,
    ToggleTerminalFullscreen,
    FetchServerProcesses,
    OpenImagePreview,
  };
}

function UpdateDbConnectionCard(server) {
  const env = server.EnvironmentVariables || {};
  const primaryPort = server.Ports && server.Ports.length > 0 ? server.Ports[0].HostPort : "PORT";
  const host = window.location.hostname || "127.0.0.1";
  let uri = "";
  let maskedUri = "";

  if (server.TemplateId.includes("mariadb")) {
    const pwd = env.MYSQL_ROOT_PASSWORD || "password";
    const db = env.MYSQL_DATABASE || "qir";
    uri = `mysql://root:${pwd}@${host}:${primaryPort}/${db}`;
    maskedUri = `mysql://root:••••••••@${host}:${primaryPort}/${db}`;
  } else if (server.TemplateId.includes("postgresql")) {
    const user = env.POSTGRES_USER || "postgres";
    const pwd = env.POSTGRES_PASSWORD || "postgres";
    const db = env.POSTGRES_DB || "qir";
    uri = `postgresql://${user}:${pwd}@${host}:${primaryPort}/${db}`;
    maskedUri = `postgresql://${user}:••••••••@${host}:${primaryPort}/${db}`;
  } else if (server.TemplateId.includes("mongo")) {
    const user = env.MONGO_INITDB_ROOT_USERNAME || "admin";
    const pwd = env.MONGO_INITDB_ROOT_PASSWORD || "password";
    uri = `mongodb://${user}:${pwd}@${host}:${primaryPort}`;
    maskedUri = `mongodb://${user}:••••••••@${host}:${primaryPort}`;
  } else if (server.TemplateId.includes("redis")) {
    const pwd = env.REDIS_PASSWORD || "";
    uri = pwd ? `redis://:${pwd}@${host}:${primaryPort}` : `redis://${host}:${primaryPort}`;
    maskedUri = pwd ? `redis://:••••••••@${host}:${primaryPort}` : `redis://${host}:${primaryPort}`;
  }

  const uriText = document.getElementById("DbConnectionUriText");
  if (uriText) {
    uriText.textContent = DbPasswordMasked ? maskedUri : uri;
    uriText.dataset.fullUri = uri;
  }
}

function RenderServerEnvironmentTab() {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  if (!server) return;

  const tbody = document.getElementById("DetailEnvTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const env = server.EnvironmentVariables || {};
  const entries = Object.entries(env);

  if (entries.length === 0) {
    tbody.innerHTML = `
      <tr id="DetailEnvEmptyRow">
        <td colspan="3" class="text-center py-4 text-body-secondary">
          No custom environment variables configured. Click "Add Variable" to create one.
        </td>
      </tr>
    `;
    return;
  }

  for (const [key, value] of entries) {
    AddEnvRow(key, value);
  }
}

function AddEnvRow(key = "", value = "") {
  const tbody = document.getElementById("DetailEnvTableBody");
  const emptyRow = document.getElementById("DetailEnvEmptyRow");
  if (emptyRow) emptyRow.remove();

  const tr = document.createElement("tr");
  tr.className = "EnvTableRow";
  tr.innerHTML = `
    <td>
      <input type="text" class="form-control form-control-sm font-monospace EnvKeyInput" value="${escapeHtml(key)}" placeholder="KEY_NAME">
    </td>
    <td>
      <div class="input-group input-group-sm">
        <input type="${EnvValuesMasked ? "password" : "text"}" class="form-control font-monospace EnvValueInput" value="${escapeHtml(value)}" placeholder="Value">
        <button class="btn btn-outline-secondary EnvRowToggleBtn" type="button" title="Toggle visibility">
          <i class="bi ${EnvValuesMasked ? "bi-eye" : "bi-eye-slash"}"></i>
        </button>
      </div>
    </td>
    <td class="text-end">
      <button class="btn btn-xs btn-outline-danger EnvRowDeleteBtn" type="button" title="Remove variable">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;

  tr.querySelector(".EnvRowToggleBtn").addEventListener("click", () => {
    const input = tr.querySelector(".EnvValueInput");
    const icon = tr.querySelector(".EnvRowToggleBtn i");
    if (input.type === "password") {
      input.type = "text";
      icon.className = "bi bi-eye-slash";
    } else {
      input.type = "password";
      icon.className = "bi bi-eye";
    }
  });

  tr.querySelector(".EnvRowDeleteBtn").addEventListener("click", () => {
    tr.remove();
  });

  tbody.appendChild(tr);
}

function SetupEnvironmentTabListeners() {
  const addBtn = document.getElementById("EnvAddRowBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => AddEnvRow());
  }

  const maskBtn = document.getElementById("EnvToggleMaskBtn");
  if (maskBtn) {
    maskBtn.addEventListener("click", () => {
      EnvValuesMasked = !EnvValuesMasked;
      maskBtn.innerHTML = `<i class="bi ${EnvValuesMasked ? "bi-eye" : "bi-eye-slash"}"></i> ${EnvValuesMasked ? "Show Values" : "Hide Values"}`;
      const inputs = document.querySelectorAll(".EnvValueInput");
      inputs.forEach((input) => {
        input.type = EnvValuesMasked ? "password" : "text";
      });
      const icons = document.querySelectorAll(".EnvRowToggleBtn i");
      icons.forEach((icon) => {
        icon.className = `bi ${EnvValuesMasked ? "bi-eye" : "bi-eye-slash"}`;
      });
    });
  }

  const saveBtn = document.getElementById("SaveEnvVarsBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (!ActiveDetailServerId) return;
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;

      const rows = document.querySelectorAll(".EnvTableRow");
      const envObj = {};
      rows.forEach((row) => {
        const key = row.querySelector(".EnvKeyInput").value.trim();
        const val = row.querySelector(".EnvValueInput").value;
        if (key) {
          envObj[key] = val;
        }
      });

      try {
        const res = await fetch(`/api/servers/${ActiveDetailServerId}/env`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ EnvironmentVariables: envObj }),
        });
        const json = await res.json();
        if (json.Success) {
          ShowToast("Environment variables saved and container updated!", "success");
          await FetchSingleServer(ActiveDetailServerId);
        } else {
          ShowToast(json.Error || "Failed to update environment", "error");
        }
      } catch {
        ShowToast("Network error updating environment", "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="bi bi-check2 me-1"></i> Save & Apply Variables`;
      }
    });
  }

  const dbMaskBtn = document.getElementById("DbToggleMaskBtn");
  if (dbMaskBtn) {
    dbMaskBtn.addEventListener("click", () => {
      DbPasswordMasked = !DbPasswordMasked;
      dbMaskBtn.innerHTML = `<i class="bi ${DbPasswordMasked ? "bi-eye" : "bi-eye-slash"}"></i> ${DbPasswordMasked ? "Show" : "Hide"}`;
      const server = Servers.find((s) => s.Id === ActiveDetailServerId);
      if (server) UpdateDbConnectionCard(server);
    });
  }

  const dbCopyBtn = document.getElementById("DbCopyUriBtn");
  if (dbCopyBtn) {
    dbCopyBtn.addEventListener("click", () => {
      const uriText = document.getElementById("DbConnectionUriText");
      if (uriText?.dataset?.fullUri) {
        navigator.clipboard.writeText(uriText.dataset.fullUri);
        ShowToast("Database connection URI copied to clipboard!", "success");
      }
    });
  }
}

function SetupFilterChips() {
  const chips = document.querySelectorAll(".FilterChip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => {
        c.classList.remove("active", "btn-primary");
        c.classList.add("btn-outline-secondary");
      });
      chip.classList.add("active", "btn-primary");
      chip.classList.remove("btn-outline-secondary");
      ActiveServerFilter = chip.dataset.filter || "all";
      RenderServersTable();
    });
  });
}

function SetupMobileSidebar() {
  const toggleBtn = document.getElementById("MobileSidebarToggle");
  const sidebar = document.querySelector(".Sidebar");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("MobileOpen");
    });
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("MobileOpen") && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove("MobileOpen");
      }
    });
  }
}

function SetupCommandPalette() {
  const modalEl = document.getElementById("CommandPaletteModal");
  if (!modalEl) return;
  const modal = new bootstrap.Modal(modalEl);
  const input = document.getElementById("CommandPaletteInput");
  const list = document.getElementById("CommandPaletteList");
  let selectedIndex = 0;
  let currentResults = [];

  const openPalette = () => {
    modal.show();
    setTimeout(() => {
      input.value = "";
      RenderPaletteResults("");
      input.focus();
    }, 150);
  };

  const openBtn = document.getElementById("OpenCommandPaletteBtn");
  if (openBtn) openBtn.addEventListener("click", openPalette);

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openPalette();
    } else if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      openPalette();
    }
  });

  input.addEventListener("input", () => {
    RenderPaletteResults(input.value.trim().toLowerCase());
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(1, currentResults.length);
      HighlightPaletteItem();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + currentResults.length) % Math.max(1, currentResults.length);
      HighlightPaletteItem();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentResults[selectedIndex]) {
        currentResults[selectedIndex].action();
        modal.hide();
      }
    }
  });

  function RenderPaletteResults(query) {
    list.innerHTML = "";
    selectedIndex = 0;
    currentResults = [];

    const actions = [
      {
        title: "Deploy Container Instance",
        subtitle: "Launch a new Docker container using blueprints",
        icon: "bi-plus-circle text-primary",
        action: () => { OpenDeployModal(); },
      },
      {
        title: "Start All Stopped Containers",
        subtitle: "Bulk startup operation for all instances",
        icon: "bi-play-circle text-success",
        action: () => { Elements.BulkStartBtn?.click(); },
      },
      {
        title: "Stop All Running Containers",
        subtitle: "Graceful bulk shutdown across all workloads",
        icon: "bi-stop-circle text-warning",
        action: () => { Elements.BulkStopBtn?.click(); },
      },
      {
        title: "Security & Active Sessions",
        subtitle: "Configure 2FA Authenticator and review active logins",
        icon: "bi-shield-check text-info",
        action: () => { OpenSecurityModal(); },
      },
      {
        title: "System & Docker Diagnostics",
        subtitle: "View host CPU, memory, platform, and Docker socket info",
        icon: "bi-cpu text-secondary",
        action: () => { SwitchView("System"); },
      },
      {
        title: "Hosting Blueprints",
        subtitle: "Explore pre-configured templates (Databases, Minecraft, Bots)",
        icon: "bi-grid-1x2 text-info",
        action: () => { SwitchView("Templates"); },
      },
    ];

    if (CurrentUser?.Role === "admin") {
      actions.push({
        title: "Manage Users",
        subtitle: "Create, view, and delete system users",
        icon: "bi-people text-primary",
        action: () => { SwitchView("Users"); },
      });
    }

    for (const server of Servers) {
      actions.push({
        title: `Jump to: ${server.Name}`,
        subtitle: `${server.Status} | ${server.TemplateId} | ${server.Ports?.map((p) => p.HostPort).join(", ") || "No ports"}`,
        icon: "bi-server text-light",
        action: () => { OpenServerDetail(server.Id); },
      });
    }

    const filtered = query
      ? actions.filter((a) => a.title.toLowerCase().includes(query) || a.subtitle.toLowerCase().includes(query))
      : actions;

    currentResults = filtered;

    if (filtered.length === 0) {
      list.innerHTML = `<div class="p-3 text-center text-body-secondary small">No commands or instances match "${escapeHtml(query)}"</div>`;
      return;
    }

    filtered.forEach((item, idx) => {
      const el = document.createElement("div");
      el.className = `CommandPaletteItem d-flex align-items-center justify-content-between ${idx === 0 ? "selected" : ""}`;
      el.innerHTML = `
        <div class="d-flex align-items-center gap-2 overflow-hidden">
          <i class="bi ${item.icon} fs-5"></i>
          <div>
            <div class="small fw-medium text-truncate">${item.title}</div>
            <div class="text-body-tertiary text-truncate" style="font-size:0.75rem;">${item.subtitle}</div>
          </div>
        </div>
        <i class="bi bi-arrow-return-left text-body-secondary small"></i>
      `;
      el.addEventListener("click", () => {
        item.action();
        modal.hide();
      });
      el.addEventListener("mouseenter", () => {
        selectedIndex = idx;
        HighlightPaletteItem();
      });
      list.appendChild(el);
    });
  }

  function HighlightPaletteItem() {
    const items = list.querySelectorAll(".CommandPaletteItem");
    items.forEach((item, idx) => {
      item.classList.toggle("selected", idx === selectedIndex);
      if (idx === selectedIndex) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }
}

function SetupSecurityModal() {
  const modalEl = document.getElementById("SecuritySessionsModal");
  if (!modalEl) return;
  const modal = new bootstrap.Modal(modalEl);

  const openBtn = document.getElementById("OpenSecurityModalBtn");
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      OpenSecurityModal();
    });
  }

  window.OpenSecurityModal = async () => {
    modal.show();
    UpdateTotpStatusUI();
    await LoadActiveSessions();
  };

  const startSetupBtn = document.getElementById("StartTotpSetupBtn");
  const setupContainer = document.getElementById("TotpSetupContainer");
  const disableBtn = document.getElementById("DisableTotpBtn");
  const confirmTotpBtn = document.getElementById("ConfirmTotpBtn");
  const verifyInput = document.getElementById("TotpVerifyInput");
  const errorAlert = document.getElementById("TotpErrorAlert");

  if (startSetupBtn) {
    startSetupBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
        const json = await res.json();
        if (json.Success) {
          setupContainer.classList.remove("d-none");
          document.getElementById("TotpSecretManualInput").value = json.Data.Secret;
          RenderTotpQrCode(json.Data.Uri);
        } else {
          ShowToast(json.Error || "Failed to setup 2FA", "error");
        }
      } catch {
        ShowToast("Network error initiating 2FA setup", "error");
      }
    });
  }

  if (confirmTotpBtn) {
    confirmTotpBtn.addEventListener("click", async () => {
      const code = verifyInput.value.trim();
      if (code.length !== 6) {
        errorAlert.textContent = "Please enter a valid 6-digit verification code.";
        errorAlert.classList.remove("d-none");
        return;
      }
      try {
        const res = await fetch("/api/auth/2fa/enable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Token: code }),
        });
        const json = await res.json();
        if (json.Success) {
          ShowToast("Two-factor authentication successfully enabled!", "success");
          if (CurrentUser) CurrentUser.TotpEnabled = true;
          setupContainer.classList.add("d-none");
          UpdateTotpStatusUI();
        } else {
          errorAlert.textContent = json.Error || "Invalid code. Please try again.";
          errorAlert.classList.remove("d-none");
        }
      } catch {
        errorAlert.textContent = "Network error validating 2FA code.";
        errorAlert.classList.remove("d-none");
      }
    });
  }

  if (disableBtn) {
    disableBtn.addEventListener("click", async () => {
      const password = prompt("Enter your master password to disable 2FA:");
      if (!password) return;
      try {
        const res = await fetch("/api/auth/2fa/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Password: password }),
        });
        const json = await res.json();
        if (json.Success) {
          ShowToast("Two-factor authentication disabled", "info");
          if (CurrentUser) CurrentUser.TotpEnabled = false;
          UpdateTotpStatusUI();
        } else {
          ShowToast(json.Error || "Failed to disable 2FA", "error");
        }
      } catch {
        ShowToast("Network error disabling 2FA", "error");
      }
    });
  }

  const copySecretBtn = document.getElementById("CopyTotpSecretBtn");
  if (copySecretBtn) {
    copySecretBtn.addEventListener("click", () => {
      const val = document.getElementById("TotpSecretManualInput").value;
      if (val) {
        navigator.clipboard.writeText(val);
        ShowToast("2FA Secret copied to clipboard!", "success");
      }
    });
  }

  const revokeOtherBtn = document.getElementById("RevokeOtherSessionsBtn");
  if (revokeOtherBtn) {
    revokeOtherBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/auth/sessions", { method: "DELETE" });
        const json = await res.json();
        if (json.Success) {
          ShowToast("All other sessions revoked", "success");
          await LoadActiveSessions();
        }
      } catch {
        ShowToast("Network error revoking sessions", "error");
      }
    });
  }
}

function UpdateTotpStatusUI() {
  const badge = document.getElementById("TotpStatusBadge");
  const startBtn = document.getElementById("StartTotpSetupBtn");
  const disableBtn = document.getElementById("DisableTotpBtn");
  const isEnabled = Boolean(CurrentUser?.TotpEnabled);

  if (badge) {
    badge.className = `badge ${isEnabled ? "text-bg-success" : "text-bg-secondary"}`;
    badge.textContent = isEnabled ? "Active & Protected" : "Disabled";
  }
  if (startBtn) startBtn.classList.toggle("d-none", isEnabled);
  if (disableBtn) disableBtn.classList.toggle("d-none", !isEnabled);
}

function RenderTotpQrCode(uri) {
  const container = document.getElementById("TotpQrCodeContainer");
  if (!container) return;
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(uri);
  container.innerHTML = `<img src="${qrUrl}" alt="2FA QR Code" width="160" height="160" class="img-fluid rounded">`;
}

async function LoadActiveSessions() {
  const tbody = document.getElementById("ActiveSessionsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-body-secondary">Loading active sessions...</td></tr>`;

  try {
    const res = await fetch("/api/auth/sessions");
    const json = await res.json();
    if (json.Success && Array.isArray(json.Data)) {
      if (json.Data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-body-secondary">No active sessions found.</td></tr>`;
        return;
      }
      tbody.innerHTML = "";
      for (const s of json.Data) {
        const tr = document.createElement("tr");
        const isCurrent = s.IsCurrent;
        tr.innerHTML = `
          <td>
            <div class="d-flex align-items-center gap-2">
              <i class="bi ${s.UserAgent.includes("Mobile") ? "bi-phone" : "bi-laptop"} text-body-secondary fs-5"></i>
              <div>
                <div class="small fw-medium">${escapeHtml(s.UserAgent.slice(0, 40))}</div>
                ${isCurrent ? '<span class="badge text-bg-primary" style="font-size:0.65rem;">This Device</span>' : ""}
              </div>
            </div>
          </td>
          <td class="font-monospace small text-body-secondary">${escapeHtml(s.IpAddress)}</td>
          <td class="small text-body-secondary">${new Date(s.CreatedAt).toLocaleString()}</td>
          <td class="text-end pe-2">
            ${isCurrent ? '<span class="text-body-tertiary small">Active</span>' : `<button class="btn btn-xs btn-outline-danger RevokeSessionBtn" data-id="${s.Id}">Revoke</button>`}
          </td>
        `;
        const revokeBtn = tr.querySelector(".RevokeSessionBtn");
        if (revokeBtn) {
          revokeBtn.addEventListener("click", async () => {
            try {
              const delRes = await fetch(`/api/auth/sessions/${s.Id}`, { method: "DELETE" });
              const delJson = await delRes.json();
              if (delJson.Success) {
                ShowToast("Session revoked", "info");
                await LoadActiveSessions();
              }
            } catch {
              ShowToast("Network error revoking session", "error");
            }
          });
        }
        tbody.appendChild(tr);
      }
    }
  } catch {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger">Failed to load active sessions.</td></tr>`;
  }
}


let MetricsHistory = [];

function DrawResourceChart() {
  const canvas = Elements.ResourceMetricsCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth - 32 : 600;
  const height = canvas.height = 70;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.25);
  ctx.lineTo(width, height * 0.25);
  ctx.moveTo(0, height * 0.5);
  ctx.lineTo(width, height * 0.5);
  ctx.moveTo(0, height * 0.75);
  ctx.lineTo(width, height * 0.75);
  ctx.stroke();

  if (MetricsHistory.length < 2) return;

  const step = width / (Math.max(MetricsHistory.length - 1, 1));

  ctx.beginPath();
  for (let i = 0; i < MetricsHistory.length; i++) {
    const x = i * step;
    const y = height - (MetricsHistory[i].mem / 100) * (height - 8) - 4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  ctx.stroke();

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--qir-accent").trim() || "#6366f1";
  ctx.beginPath();
  for (let i = 0; i < MetricsHistory.length; i++) {
    const x = i * step;
    const y = height - (MetricsHistory[i].cpu / 100) * (height - 8) - 4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();
}


function SetupThemeCustomizer() {
  const saved = localStorage.getItem("qir_theme") || "indigo";
  document.documentElement.setAttribute("data-theme", saved);

  document.querySelectorAll(".ThemeSelectBtn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("qir_theme", theme);
      DrawResourceChart();
      ShowToast("Theme updated to " + theme, "info");
    });
  });
}

function SetupExtraServerFeatures() {
  if (Elements.DetailFilesCompressBtn) {
    Elements.DetailFilesCompressBtn.addEventListener("click", async () => {
      const archiveName = prompt("Enter archive name (e.g. backup.tar.gz):", "archive.tar.gz");
      if (!archiveName) return;
      try {
        const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/compress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ArchiveName: archiveName, Paths: [] }),
        });
        const json = await res.json();
        if (json.Success) {
          ShowToast("Archive created: " + json.Data.ArchiveName, "success");
          FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
        } else {
          ShowToast("Compression failed: " + json.Error, "error");
        }
      } catch {
        ShowToast("Network error creating archive", "error");
      }
    });
  }

  if (Elements.EnvImportDotEnvBtn) {
    Elements.EnvImportDotEnvBtn.addEventListener("click", () => {
      if (Elements.BulkDotEnvTextarea) Elements.BulkDotEnvTextarea.value = "";
      const modal = GetBootstrapModal(Elements.BulkDotEnvModal);
      if (modal) modal.show();
    });
  }

  if (Elements.BulkDotEnvApplyBtn) {
    Elements.BulkDotEnvApplyBtn.addEventListener("click", () => {
      const text = Elements.BulkDotEnvTextarea?.value || "";
      const lines = text.split(/\r?\n/);
      let count = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        AddEnvRow(key, val);
        count++;
      }
      const modal = GetBootstrapModal(Elements.BulkDotEnvModal);
      if (modal) modal.hide();
      ShowToast(`Imported ${count} environment variables`, "success");
    });
  }

  if (Elements.DetailSaveAlertWebhookBtn) {
    Elements.DetailSaveAlertWebhookBtn.addEventListener("click", async () => {
      const webhookUrl = Elements.DetailAlertWebhookInput?.value.trim() || "";
      try {
        const res = await fetch(`/api/servers/${ActiveDetailServerId}/alert-webhook`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ AlertWebhookUrl: webhookUrl }),
        });
        const json = await res.json();
        if (json.Success) {
          ShowToast("Alert webhook updated successfully", "success");
        } else {
          ShowToast("Failed to update webhook: " + json.Error, "error");
        }
      } catch {
        ShowToast("Network error saving alert webhook", "error");
      }
    });
  }

  if (Elements.DetailTestAlertWebhookBtn) {
    Elements.DetailTestAlertWebhookBtn.addEventListener("click", async () => {
      try {
        const res = await fetch(`/api/servers/${ActiveDetailServerId}/test-alert-webhook`, {
          method: "POST",
        });
        const json = await res.json();
        if (json.Success) {
          ShowToast("Alert notification dispatched successfully!", "info");
        } else {
          ShowToast("Failed to dispatch test alert: " + json.Error, "error");
        }
      } catch {
        ShowToast("Network error testing alert webhook", "error");
      }
    });
  }

  if (Elements.DetailExportAuditCsvBtn) {
    Elements.DetailExportAuditCsvBtn.addEventListener("click", () => {
      window.open("/api/system/audit/export?Format=csv", "_blank");
    });
  }

  if (Elements.DetailExportAuditJsonBtn) {
    Elements.DetailExportAuditJsonBtn.addEventListener("click", () => {
      window.open("/api/system/audit/export?Format=json", "_blank");
    });
  }

  if (Elements.DetailQuickExecBtn) {
    Elements.DetailQuickExecBtn.addEventListener("click", OpenQuickExecModal);
  }
  if (Elements.QuickExecForm) {
    Elements.QuickExecForm.addEventListener("submit", HandleQuickExecSubmit);
  }
  if (Elements.QuickExecCopyBtn) {
    Elements.QuickExecCopyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(Elements.QuickExecOutputPre.textContent);
      ShowToast("Output copied to clipboard", "success");
    });
  }
  document.querySelectorAll(".QuickExecPresetBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      Elements.QuickExecCommandInput.value = btn.dataset.cmd;
    });
  });

  if (Elements.DetailConsoleFullscreenBtn) {
    Elements.DetailConsoleFullscreenBtn.addEventListener("click", ToggleTerminalFullscreen);
  }
  if (Elements.DetailConsoleDownloadBtn) {
    Elements.DetailConsoleDownloadBtn.addEventListener("click", DownloadConsoleLogs);
  }
  if (Elements.ConsoleLogFilterInput) {
    Elements.ConsoleLogFilterInput.addEventListener("input", HandleConsoleFilterInput);
  }
  if (Elements.ConsoleClearFilterBtn) {
    Elements.ConsoleClearFilterBtn.addEventListener("click", () => {
      Elements.ConsoleLogFilterInput.value = "";
      HandleConsoleFilterInput();
    });
  }

  document.querySelectorAll(".ConfigResourcePresetBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ConfigResourcePresetBtn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (Elements.DetailMemoryLimitSelect) {
        Elements.DetailMemoryLimitSelect.value = btn.dataset.mem;
      }
      if (Elements.DetailCpuSharesSelect) {
        Elements.DetailCpuSharesSelect.value = btn.dataset.cpu;
      }
      if (Elements.DetailMemorySlider) {
        Elements.DetailMemorySlider.value = btn.dataset.mem;
        UpdateMemorySliderLabel(btn.dataset.mem);
      }
      if (Elements.DetailCpuSlider) {
        Elements.DetailCpuSlider.value = btn.dataset.cpu;
        UpdateCpuSliderLabel(btn.dataset.cpu);
      }
    });
  });

  if (Elements.DetailMemorySlider) {
    Elements.DetailMemorySlider.addEventListener("input", (e) => {
      Elements.DetailMemoryLimitSelect.value = e.target.value;
      UpdateMemorySliderLabel(e.target.value);
    });
  }
  if (Elements.DetailMemoryLimitSelect) {
    Elements.DetailMemoryLimitSelect.addEventListener("change", (e) => {
      if (Elements.DetailMemorySlider) {
        Elements.DetailMemorySlider.value = e.target.value;
      }
      UpdateMemorySliderLabel(e.target.value);
    });
  }
  if (Elements.DetailCpuSlider) {
    Elements.DetailCpuSlider.addEventListener("input", (e) => {
      Elements.DetailCpuSharesSelect.value = e.target.value;
      UpdateCpuSliderLabel(e.target.value);
    });
  }
  if (Elements.DetailCpuSharesSelect) {
    Elements.DetailCpuSharesSelect.addEventListener("change", (e) => {
      if (Elements.DetailCpuSlider) {
        Elements.DetailCpuSlider.value = e.target.value;
      }
      UpdateCpuSliderLabel(e.target.value);
    });
  }

  if (Elements.DetailPauseBtn) {
    Elements.DetailPauseBtn.addEventListener("click", async () => {
      const server = Servers.find((s) => s.Id === ActiveDetailServerId);
      if (!server) return;
      const isPaused = server.Status === "Paused";
      const action = isPaused ? "unpause" : "pause";
      try {
        const res = await fetch(`/api/servers/${ActiveDetailServerId}/${action}`, { method: "POST" });
        const json = await res.json();
        if (json.Success) {
          ShowToast(`Server ${isPaused ? "resumed" : "paused"} successfully`, "success");
          await FetchSingleServer(ActiveDetailServerId);
        } else {
          ShowToast(`Failed to ${action} server: ` + json.Error, "error");
        }
      } catch {
        ShowToast(`Failed to ${action} server`, "error");
      }
    });
  }

  if (Elements.SystemBannerSaveBtn) {
    Elements.SystemBannerSaveBtn.addEventListener("click", async () => {
      const enabled = Elements.SystemBannerEnableSwitch.checked;
      const type = Elements.SystemBannerTypeSelect.value;
      const message = Elements.SystemBannerTextInput.value.trim();
      try {
        const res = await fetch("/api/system/banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Enabled: enabled, Type: type, Message: message }),
        });
        const json = await res.json();
        if (json.Success) {
          ShowToast("Announcement banner broadcast updated", "success");
          sessionStorage.removeItem("qir_banner_dismissed");
          FetchAnnouncementBanner();
        } else {
          ShowToast("Failed to update banner: " + json.Error, "error");
        }
      } catch {
        ShowToast("Network error saving broadcast banner", "error");
      }
    });
  }

  if (Elements.GlobalAnnouncementCloseBtn) {
    Elements.GlobalAnnouncementCloseBtn.addEventListener("click", () => {
      Elements.GlobalAnnouncementBanner.classList.add("d-none");
      sessionStorage.setItem("qir_banner_dismissed", "1");
    });
  }

  if (Elements.DbConnectionTestBtn) {
    Elements.DbConnectionTestBtn.addEventListener("click", HandleDbConnectionTest);
  }
  if (Elements.DetailCopyComposeBtn) {
    Elements.DetailCopyComposeBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(Elements.DetailDockerComposePre.textContent);
      ShowToast("docker-compose.yml copied to clipboard", "success");
    });
  }
  if (Elements.DetailDownloadComposeBtn) {
    Elements.DetailDownloadComposeBtn.addEventListener("click", () => {
      const yaml = Elements.DetailDockerComposePre.textContent;
      const blob = new Blob([yaml], { type: "text/yaml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "docker-compose.yml";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      ShowToast("docker-compose.yml downloaded", "success");
    });
  }
  if (Elements.EnvCloneApplyBtn) {
    Elements.EnvCloneApplyBtn.addEventListener("click", () => {
      const sourceId = Elements.EnvCloneSourceSelect?.value;
      if (!sourceId) {
        ShowToast("Select a source server to clone variables from", "warning");
        return;
      }
      const source = Servers.find((s) => s.Id === sourceId);
      if (!source || !source.EnvironmentVariables) {
        ShowToast("No environment variables found on source server", "warning");
        return;
      }
      const entries = Object.entries(source.EnvironmentVariables);
      if (entries.length === 0) {
        ShowToast("Selected server has no environment variables", "info");
        return;
      }
      for (const [k, v] of entries) {
        AddEnvRow(k, v);
      }
      ShowToast(`Cloned ${entries.length} environment variables from ${source.Name}`, "success");
    });
  }

  if (Elements.FileEditorWrapBtn) {
    Elements.FileEditorWrapBtn.addEventListener("click", () => {
      Elements.FileEditorTextarea.classList.toggle("wrap-active");
      ShowToast("Line wrapping toggled", "info");
    });
  }
  if (Elements.FileEditorDownloadBtn) {
    Elements.FileEditorDownloadBtn.addEventListener("click", () => {
      const text = Elements.FileEditorTextarea.value;
      const fileName = ActiveEditFilePath ? ActiveEditFilePath.split("/").pop() : "file.txt";
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  if (Elements.FileEditorTextarea) {
    Elements.FileEditorTextarea.addEventListener("input", UpdateEditorGutter);
    Elements.FileEditorTextarea.addEventListener("scroll", () => {
      if (Elements.FileEditorGutter) Elements.FileEditorGutter.scrollTop = Elements.FileEditorTextarea.scrollTop;
    });
    Elements.FileEditorTextarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        HandleFileEditorSave();
      }
    });
  }

  if (Elements.DetailOpenInspectBtn) {
    Elements.DetailOpenInspectBtn.addEventListener("click", OpenDockerInspectModal);
  }
  if (Elements.InspectCopyJsonBtn) {
    Elements.InspectCopyJsonBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(Elements.InspectContainerJsonPre.textContent);
      ShowToast("Inspect JSON copied to clipboard", "success");
    });
  }
  if (Elements.InspectSearchInput) {
    Elements.InspectSearchInput.addEventListener("input", () => {
      RenderInspectJson(RawInspectData, Elements.InspectSearchInput.value);
    });
  }

  if (Elements.DetailExportVolumeBtn) {
    Elements.DetailExportVolumeBtn.addEventListener("click", ExportFullVolume);
  }

  if (Elements.RefreshDockerDiskUsageBtn) {
    Elements.RefreshDockerDiskUsageBtn.addEventListener("click", FetchDockerDiskUsage);
  }
  if (Elements.PruneImagesBtn) {
    Elements.PruneImagesBtn.addEventListener("click", () => TriggerDockerPrune("images"));
  }
  if (Elements.PruneContainersBtn) {
    Elements.PruneContainersBtn.addEventListener("click", () => TriggerDockerPrune("containers"));
  }
  if (Elements.PruneVolumesBtn) {
    Elements.PruneVolumesBtn.addEventListener("click", () => TriggerDockerPrune("volumes"));
  }
  if (Elements.PruneBuilderBtn) {
    Elements.PruneBuilderBtn.addEventListener("click", () => TriggerDockerPrune("builder"));
  }
  if (Elements.PruneAllBtn) {
    Elements.PruneAllBtn.addEventListener("click", () => TriggerDockerPrune("all"));
  }

  if (Elements.BulkRestartBtn) {
    Elements.BulkRestartBtn.addEventListener("click", HandleBulkRestart);
  }
  if (Elements.FilesSearchInput) {
    Elements.FilesSearchInput.addEventListener("input", HandleFilesSearchInput);
  }
  if (Elements.EnvExportDotEnvBtn) {
    Elements.EnvExportDotEnvBtn.addEventListener("click", HandleExportDotEnv);
  }
  if (Elements.DetailRedeployBtn) {
    Elements.DetailRedeployBtn.addEventListener("click", HandleRedeployServer);
  }
  if (Elements.DetailRefreshProcessesBtn) {
    Elements.DetailRefreshProcessesBtn.addEventListener("click", () => FetchServerProcesses(ActiveDetailServerId));
  }
  if (Elements.FilesSelectAllCheckbox) {
    Elements.FilesSelectAllCheckbox.addEventListener("change", (e) => {
      const checked = e.target.checked;
      const checkboxes = Elements.DetailFilesTableBody.querySelectorAll(".FileRowCheckbox");
      for (const cb of checkboxes) {
        cb.checked = checked;
      }
      UpdateFilesBatchState();
    });
  }
  if (Elements.FilesBatchDeleteBtn) {
    Elements.FilesBatchDeleteBtn.addEventListener("click", HandleFilesBatchDelete);
  }
  if (Elements.FilesBatchCompressBtn) {
    Elements.FilesBatchCompressBtn.addEventListener("click", HandleFilesBatchCompress);
  }
  if (Elements.DetailAddTagBtn) {
    Elements.DetailAddTagBtn.addEventListener("click", HandleAddTag);
  }
  if (Elements.DetailTagInput) {
    Elements.DetailTagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        HandleAddTag();
      }
    });
  }
}

let RawInspectData = null;

function ToggleTerminalFullscreen() {
  const card = document.querySelector(".TerminalCard");
  if (!card) return;
  const isFs = card.classList.toggle("TerminalFullscreenMode");
  const icon = Elements.DetailConsoleFullscreenBtn?.querySelector("i");
  if (icon) {
    icon.className = isFs ? "bi bi-fullscreen-exit" : "bi bi-arrows-fullscreen";
  }
  ScrollTerminalToBottom();
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const card = document.querySelector(".TerminalCard.TerminalFullscreenMode");
    if (card) {
      ToggleTerminalFullscreen();
    }
  }
});

function DownloadConsoleLogs() {
  const text = Elements.DetailTerminalOutput?.innerText || "";
  if (!text.trim()) {
    ShowToast("No console logs to download", "warning");
    return;
  }
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qir-${ActiveDetailServerId || "server"}-logs.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  ShowToast("Logs exported successfully", "success");
}

function HandleConsoleFilterInput() {
  const query = Elements.ConsoleLogFilterInput?.value.trim().toLowerCase() || "";
  if (Elements.ConsoleClearFilterBtn) {
    Elements.ConsoleClearFilterBtn.classList.toggle("d-none", !query);
  }
  const lines = Elements.DetailTerminalOutput?.querySelectorAll("div, span, p");
  if (!lines || lines.length === 0) return;
  if (!query) {
    lines.forEach((el) => {
      el.style.display = "";
    });
    return;
  }
  lines.forEach((el) => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(query) ? "" : "none";
  });
}

function OpenQuickExecModal() {
  if (!ActiveDetailServerId) return;
  Elements.QuickExecCommandInput.value = "";
  Elements.QuickExecOutputPre.textContent = "Enter command and press Run...";
  Elements.QuickExecExitBadge.classList.add("d-none");
  const modal = GetBootstrapModal(Elements.QuickExecModal);
  if (modal) modal.show();
}

async function HandleQuickExecSubmit(e) {
  e.preventDefault();
  const cmd = Elements.QuickExecCommandInput.value.trim();
  if (!cmd || !ActiveDetailServerId) return;

  Elements.QuickExecRunBtn.disabled = true;
  Elements.QuickExecRunBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Running...`;
  Elements.QuickExecOutputPre.textContent = "Executing command in container...";

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Command: cmd }),
    });
    const json = await res.json();
    if (json.Success) {
      Elements.QuickExecOutputPre.textContent = json.Data.Output || "(Command executed with no output)";
      Elements.QuickExecExitBadge.textContent = "Exit: 0";
      Elements.QuickExecExitBadge.className = "badge text-bg-success font-monospace small";
      Elements.QuickExecExitBadge.classList.remove("d-none");
    } else {
      Elements.QuickExecOutputPre.textContent = json.Error || "Execution failed";
      Elements.QuickExecExitBadge.textContent = "Error";
      Elements.QuickExecExitBadge.className = "badge text-bg-danger font-monospace small";
      Elements.QuickExecExitBadge.classList.remove("d-none");
    }
  } catch (err) {
    Elements.QuickExecOutputPre.textContent = "Network error: " + err.message;
  } finally {
    Elements.QuickExecRunBtn.disabled = false;
    Elements.QuickExecRunBtn.innerHTML = `<i class="bi bi-play-fill me-1"></i> Run`;
  }
}

async function OpenDockerInspectModal() {
  if (!ActiveDetailServerId) return;
  Elements.InspectModalContainerIdLabel.textContent = "Fetching inspect data...";
  Elements.InspectContainerJsonPre.textContent = "Loading...";
  const modal = GetBootstrapModal(Elements.InspectContainerModal);
  if (modal) modal.show();

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/inspect`);
    const json = await res.json();
    if (json.Success) {
      RawInspectData = json.Data;
      Elements.InspectModalContainerIdLabel.textContent = `Container ID: ${json.Data.Id ? json.Data.Id.slice(0, 12) : ActiveDetailServerId}`;
      RenderInspectJson(RawInspectData);
    } else {
      Elements.InspectContainerJsonPre.textContent = "Error: " + (json.Error || "Failed to inspect container");
    }
  } catch (err) {
    Elements.InspectContainerJsonPre.textContent = "Network error: " + err.message;
  }
}

function RenderInspectJson(data, filter = "") {
  if (!data) return;
  let str = JSON.stringify(data, null, 2);
  if (filter) {
    const lines = str.split("\n");
    const filtered = lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()));
    str = filtered.length > 0 ? filtered.join("\n") : `No keys matching "${filter}"`;
  }
  Elements.InspectContainerJsonPre.textContent = str;
}

function ExportFullVolume() {
  if (!ActiveDetailServerId) return;
  ShowToast("Generating volume archive export...", "info");
  window.location.href = `/api/servers/${ActiveDetailServerId}/export-archive`;
}

async function FetchDockerDiskUsage() {
  try {
    const res = await fetch("/api/system/docker/df");
    const json = await res.json();
    if (json.Success && json.Data) {
      const d = json.Data;
      if (Elements.DockerLayersSizeLabel) Elements.DockerLayersSizeLabel.textContent = `${(d.LayersSize / (1024 * 1024)).toFixed(1)} MB`;
      if (Elements.DockerImagesCountLabel) Elements.DockerImagesCountLabel.textContent = `${d.ImagesCount} images`;
      if (Elements.DockerContainersCountLabel) Elements.DockerContainersCountLabel.textContent = String(d.ContainersCount);
      if (Elements.DockerVolumesCountLabel) Elements.DockerVolumesCountLabel.textContent = String(d.VolumesCount);
      if (Elements.DockerBuildCacheSizeLabel) Elements.DockerBuildCacheSizeLabel.textContent = `${(d.BuildCacheSize / (1024 * 1024)).toFixed(1)} MB`;
    }
  } catch {}
}

async function TriggerDockerPrune(target) {
  const confirmMsg = target === "all"
    ? "Are you sure you want to run a complete system prune? This will remove all stopped containers, unused networks, dangling images, and build cache."
    : `Are you sure you want to prune ${target}?`;
  if (!confirm(confirmMsg)) return;

  ShowToast(`Pruning ${target}...`, "info");
  try {
    const res = await fetch("/api/system/docker/prune", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Target: target }),
    });
    const json = await res.json();
    if (json.Success) {
      ShowToast(json.Message || "Prune completed successfully", "success");
      FetchDockerDiskUsage();
    } else {
      ShowToast("Prune error: " + json.Error, "error");
    }
  } catch (err) {
    ShowToast("Network error executing prune", "error");
  }
}

function OpenImagePreview(filePath, fileName) {
  if (!Elements.ImagePreviewModal) return;
  Elements.ImagePreviewPathLabel.textContent = `/${filePath}`;
  Elements.ImagePreviewDownloadBtn.href = `/api/servers/${ActiveDetailServerId}/files/download?FilePath=${encodeURIComponent(filePath)}`;
  Elements.ImagePreviewDownloadBtn.download = fileName;
  Elements.ImagePreviewImg.src = `/api/servers/${ActiveDetailServerId}/files/download?FilePath=${encodeURIComponent(filePath)}`;
  Elements.ImagePreviewImg.onload = () => {
    if (Elements.ImagePreviewDimensionsBadge) {
      Elements.ImagePreviewDimensionsBadge.textContent = `${Elements.ImagePreviewImg.naturalWidth} x ${Elements.ImagePreviewImg.naturalHeight} px`;
    }
  };
  const modal = GetBootstrapModal(Elements.ImagePreviewModal);
  if (modal) modal.show();
}

async function FetchServerProcesses(serverId) {
  if (!Elements.DetailProcessesTableBody) return;
  Elements.DetailProcessesTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-body-secondary"><span class="spinner-border spinner-border-sm me-2"></span>Inspecting running processes...</td></tr>`;

  try {
    const res = await fetch(`/api/servers/${serverId}/processes`);
    const json = await res.json();
    if (json.Success && json.Data && Array.isArray(json.Data.Processes)) {
      const top = json.Data;
      if (Elements.DetailProcessesCountBadge) {
        Elements.DetailProcessesCountBadge.textContent = `${top.Processes.length} processes`;
      }
      if (top.Processes.length === 0) {
        Elements.DetailProcessesTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-body-secondary">No processes currently active.</td></tr>`;
        return;
      }
      const pidIdx = top.Titles.findIndex((t) => t.toUpperCase() === "PID");
      const userIdx = top.Titles.findIndex((t) => t.toUpperCase() === "UID" || t.toUpperCase() === "USER");
      const timeIdx = top.Titles.findIndex((t) => t.toUpperCase() === "TIME");
      const cmdIdx = top.Titles.findIndex((t) => t.toUpperCase() === "CMD" || t.toUpperCase() === "COMMAND");

      Elements.DetailProcessesTableBody.innerHTML = "";
      for (const proc of top.Processes) {
        const tr = document.createElement("tr");
        const pid = pidIdx >= 0 ? proc[pidIdx] : proc[1] || "-";
        const user = userIdx >= 0 ? proc[userIdx] : proc[0] || "-";
        const time = timeIdx >= 0 ? proc[timeIdx] : proc[6] || "-";
        const cmd = cmdIdx >= 0 ? proc[cmdIdx] : proc[proc.length - 1] || "-";

        tr.innerHTML = `
          <td class="ps-3 py-2 fw-semibold text-primary">${EscapeHtml(pid)}</td>
          <td class="py-2 text-body-secondary">${EscapeHtml(user)}</td>
          <td class="py-2 text-body-secondary">${EscapeHtml(time)}</td>
          <td class="py-2 text-body text-break">${EscapeHtml(cmd)}</td>
        `;
        Elements.DetailProcessesTableBody.appendChild(tr);
      }
    } else {
      Elements.DetailProcessesTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-body-secondary">Container is not currently running. Start container to view processes.</td></tr>`;
      if (Elements.DetailProcessesCountBadge) Elements.DetailProcessesCountBadge.textContent = "0 processes";
    }
  } catch {
    Elements.DetailProcessesTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Failed to fetch container process list.</td></tr>`;
  }
}

async function HandleRedeployServer() {
  if (!ActiveDetailServerId) return;
  const newImage = Elements.DetailRedeployImageInput?.value.trim() || undefined;
  if (!confirm(`Redeploy container ${newImage ? "with image '" + newImage + "'" : "with latest image tag"}?`)) return;

  Elements.DetailRedeployBtn.disabled = true;
  Elements.DetailRedeployBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Redeploying...`;
  ShowToast("Pulling image and rolling out updated container...", "info");

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/redeploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Image: newImage }),
    });
    const json = await res.json();
    if (json.Success) {
      ShowToast("Container redeployed successfully!", "success");
      await FetchServers();
      OpenServerDetail(ActiveDetailServerId);
      SwitchDetailTab("Console");
    } else {
      ShowToast("Redeploy failed: " + json.Error, "error");
    }
  } catch (err) {
    ShowToast("Network error redeploying container", "error");
  } finally {
    Elements.DetailRedeployBtn.disabled = false;
    Elements.DetailRedeployBtn.innerHTML = `<i class="bi bi-cloud-arrow-down me-1"></i> Redeploy`;
  }
}

function HandleExportDotEnv() {
  const rows = Elements.DetailEnvTableBody?.querySelectorAll("tr") || [];
  let content = "";
  for (const row of rows) {
    const keyInput = row.querySelector(".EnvKeyInput");
    const valInput = row.querySelector(".EnvValInput");
    if (keyInput && valInput && keyInput.value.trim()) {
      content += `${keyInput.value.trim()}=${valInput.value}\n`;
    }
  }
  if (!content) {
    ShowToast("No environment variables to export", "warning");
    return;
  }
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qir-${ActiveDetailServerId || "server"}.env`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  ShowToast("Environment variables exported to .env", "success");
}

function HandleFilesSearchInput() {
  const q = Elements.FilesSearchInput?.value.trim().toLowerCase() || "";
  const rows = Elements.DetailFilesTableBody?.querySelectorAll("tr") || [];
  for (const row of rows) {
    const link = row.querySelector(".FileItemLink");
    if (!link) continue;
    const name = link.textContent.trim().toLowerCase();
    row.style.display = !q || name.includes(q) ? "" : "none";
  }
}

async function HandleBulkRestart() {
  if (!confirm("Restart all running containers across your cluster?")) return;
  Elements.BulkRestartBtn.disabled = true;
  ShowToast("Restarting running containers...", "info");
  try {
    const res = await fetch("/api/servers/bulk/restart", { method: "POST" });
    const json = await res.json();
    if (json.Success) {
      ShowToast(json.Message || "Restarted containers successfully", "success");
      await FetchServers();
    } else {
      ShowToast("Bulk restart failed: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error executing bulk restart", "error");
  } finally {
    Elements.BulkRestartBtn.disabled = false;
  }
}

function UpdateMemorySliderLabel(bytes) {
  if (!Elements.DetailMemorySliderBadge) return;
  const num = Number(bytes);
  if (num === 0) {
    Elements.DetailMemorySliderBadge.textContent = "Unlimited";
  } else if (num >= 1073741824) {
    Elements.DetailMemorySliderBadge.textContent = (num / 1073741824) + " GB";
  } else {
    Elements.DetailMemorySliderBadge.textContent = Math.round(num / (1024 * 1024)) + " MB";
  }
}

function UpdateCpuSliderLabel(shares) {
  if (!Elements.DetailCpuSliderBadge) return;
  const num = Number(shares);
  if (num === 0) {
    Elements.DetailCpuSliderBadge.textContent = "Unlimited";
  } else {
    Elements.DetailCpuSliderBadge.textContent = (num / 100).toFixed(1) + " Cores";
  }
}

async function FetchServerDockerCompose(serverId) {
  if (!Elements.DetailDockerComposePre) return;
  Elements.DetailDockerComposePre.textContent = "# Generating standalone docker-compose.yml...";
  try {
    const res = await fetch(`/api/servers/${serverId}/compose`);
    const json = await res.json();
    if (json.Success && json.Data?.ComposeYaml) {
      Elements.DetailDockerComposePre.textContent = json.Data.ComposeYaml;
    } else {
      Elements.DetailDockerComposePre.textContent = "# Failed to generate compose file: " + (json.Error || "Unknown error");
    }
  } catch {
    Elements.DetailDockerComposePre.textContent = "# Error connecting to server to generate docker-compose.yml";
  }
}

function PopulateEnvCloneDropdown() {
  if (!Elements.EnvCloneSourceSelect) return;
  Elements.EnvCloneSourceSelect.innerHTML = '<option value="">Clone from...</option>';
  for (const s of Servers) {
    if (s.Id !== ActiveDetailServerId) {
      const opt = document.createElement("option");
      opt.value = s.Id;
      opt.textContent = s.Name;
      Elements.EnvCloneSourceSelect.appendChild(opt);
    }
  }
}

async function HandleDbConnectionTest() {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  if (!server) return;
  if (!Elements.DbConnectionTestResult) return;

  Elements.DbConnectionTestBtn.disabled = true;
  Elements.DbConnectionTestResult.innerHTML = `<span class="badge text-bg-secondary"><i class="bi bi-hourglass-split me-1"></i>Testing...</span>`;

  let testCmd = "echo PING";
  if (server.TemplateId.includes("redis")) {
    const pwd = server.EnvironmentVariables?.REDIS_PASSWORD || "";
    testCmd = pwd ? `redis-cli -a "${pwd}" ping` : "redis-cli ping";
  } else if (server.TemplateId.includes("postgresql")) {
    const user = server.EnvironmentVariables?.POSTGRES_USER || "postgres";
    testCmd = `pg_isready -U ${user} || echo READY`;
  } else if (server.TemplateId.includes("mariadb")) {
    const pwd = server.EnvironmentVariables?.MYSQL_ROOT_PASSWORD || "";
    testCmd = pwd ? `mariadb-admin -uroot -p"${pwd}" ping` : "mariadb-admin -uroot ping";
  } else if (server.TemplateId.includes("mongo")) {
    testCmd = `mongosh --eval "db.adminCommand({ ping: 1 })" || echo OK`;
  }

  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Command: testCmd }),
    });
    const json = await res.json();
    if (json.Success && json.Data) {
      const out = (json.Data.Output || "").trim();
      const isOk = out.includes("PONG") || out.includes("alive") || out.includes("accepting connections") || out.includes("ok: 1") || out.includes("READY") || out.includes("OK") || json.Data.ExitCode === 0;
      if (isOk) {
        const lastLine = out.split("\n").pop().trim().slice(0, 16);
        Elements.DbConnectionTestResult.innerHTML = `<span class="badge text-bg-success"><i class="bi bi-check-circle-fill me-1"></i>Online (${lastLine || "OK"})</span>`;
      } else {
        Elements.DbConnectionTestResult.innerHTML = `<span class="badge text-bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>Resp: ${out.slice(0, 15)}</span>`;
      }
    } else {
      Elements.DbConnectionTestResult.innerHTML = `<span class="badge text-bg-danger"><i class="bi bi-x-circle-fill me-1"></i>Refused</span>`;
    }
  } catch {
    Elements.DbConnectionTestResult.innerHTML = `<span class="badge text-bg-danger"><i class="bi bi-x-circle-fill me-1"></i>Network Error</span>`;
  } finally {
    Elements.DbConnectionTestBtn.disabled = false;
  }
}

function RenderServerTags(server) {
  if (!Elements.DetailTagsContainer) return;
  Elements.DetailTagsContainer.innerHTML = "";
  const tags = server.Tags || [];
  if (tags.length === 0) {
    Elements.DetailTagsContainer.innerHTML = `<span class="small text-body-secondary">No tags assigned.</span>`;
    return;
  }
  for (const tag of tags) {
    const badge = document.createElement("span");
    badge.className = "badge bg-secondary-subtle text-secondary border font-monospace d-inline-flex align-items-center gap-1 px-2 py-1";
    badge.innerHTML = `
      <span>#${EscapeHtml(tag)}</span>
      <button type="button" class="btn-close btn-close-white ms-1 RemoveTagBtn" style="font-size: 0.55rem;" data-tag="${EscapeHtml(tag)}"></button>
    `;
    badge.querySelector(".RemoveTagBtn").addEventListener("click", () => HandleRemoveTag(tag));
    Elements.DetailTagsContainer.appendChild(badge);
  }
}

async function HandleAddTag() {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  if (!server || !Elements.DetailTagInput) return;
  const raw = Elements.DetailTagInput.value.trim().toLowerCase().replace(/^#/, "").replace(/[^a-z0-9_-]/g, "");
  if (!raw) return;
  const currentTags = server.Tags || [];
  if (currentTags.includes(raw)) {
    Elements.DetailTagInput.value = "";
    return;
  }
  const newTags = [...currentTags, raw];
  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Tags: newTags }),
    });
    const json = await res.json();
    if (json.Success) {
      server.Tags = newTags;
      Elements.DetailTagInput.value = "";
      RenderServerTags(server);
      RenderServersTable();
      ShowToast(`Tag #${raw} added`, "success");
    } else {
      ShowToast("Failed to add tag: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error updating tags", "error");
  }
}

async function HandleRemoveTag(tagToRemove) {
  const server = Servers.find((s) => s.Id === ActiveDetailServerId);
  if (!server) return;
  const newTags = (server.Tags || []).filter((t) => t !== tagToRemove);
  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Tags: newTags }),
    });
    const json = await res.json();
    if (json.Success) {
      server.Tags = newTags;
      RenderServerTags(server);
      RenderServersTable();
      ShowToast(`Tag #${tagToRemove} removed`, "info");
    } else {
      ShowToast("Failed to remove tag: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error updating tags", "error");
  }
}

function RenderServerHealthcheck(server) {
  if (!Elements.DetailHealthcheckTableBody || !Elements.DetailHealthcheckStatusBadge) return;
  const logs = server.HealthLogs || [];
  if (logs.length === 0) {
    Elements.DetailHealthcheckStatusBadge.className = "badge text-bg-secondary";
    Elements.DetailHealthcheckStatusBadge.textContent = "No Healthcheck Configured";
    Elements.DetailHealthcheckTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center py-3 text-body-secondary font-monospace small">No Docker HEALTHCHECK instructions or probe history found for this container.</td></tr>
    `;
    return;
  }
  const latest = logs[logs.length - 1];
  if (latest.ExitCode === 0) {
    Elements.DetailHealthcheckStatusBadge.className = "badge text-bg-success";
    Elements.DetailHealthcheckStatusBadge.innerHTML = `<i class="bi bi-heart-pulse-fill me-1"></i>Healthy`;
  } else {
    Elements.DetailHealthcheckStatusBadge.className = "badge text-bg-danger";
    Elements.DetailHealthcheckStatusBadge.innerHTML = `<i class="bi bi-heartbreak-fill me-1"></i>Unhealthy (Code ${latest.ExitCode})`;
  }

  Elements.DetailHealthcheckTableBody.innerHTML = "";
  const reversed = [...logs].reverse();
  for (const log of reversed) {
    const tr = document.createElement("tr");
    const isSuccess = log.ExitCode === 0;
    const badgeClass = isSuccess ? "text-bg-success" : "text-bg-danger";
    const statusText = isSuccess ? "Passing (0)" : `Failing (${log.ExitCode})`;
    const startFormatted = log.Start ? new Date(log.Start).toLocaleTimeString() : "-";
    const endFormatted = log.End ? new Date(log.End).toLocaleTimeString() : "-";

    tr.innerHTML = `
      <td class="ps-3 py-2 font-monospace small">${startFormatted} - ${endFormatted}</td>
      <td class="py-2"><span class="badge ${badgeClass} font-monospace">${statusText}</span></td>
      <td class="py-2 font-monospace small text-body-secondary text-truncate" style="max-width: 320px;">${EscapeHtml(log.Output || "(no output)")}</td>
    `;
    Elements.DetailHealthcheckTableBody.appendChild(tr);
  }
}

async function HandleFilesBatchDelete() {
  const checked = Elements.DetailFilesTableBody.querySelectorAll(".FileRowCheckbox:checked");
  if (checked.length === 0) return;
  const paths = Array.from(checked).map((cb) => cb.dataset.path);
  if (!confirm(`Are you sure you want to delete ${paths.length} selected items? This cannot be undone.`)) return;

  Elements.FilesBatchDeleteBtn.disabled = true;
  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/batch-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Paths: paths }),
    });
    const json = await res.json();
    if (json.Success) {
      ShowToast(`Deleted ${json.Data?.DeletedCount || paths.length} files successfully`, "success");
      FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
    } else {
      ShowToast("Batch delete failed: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error executing batch delete", "error");
  } finally {
    Elements.FilesBatchDeleteBtn.disabled = false;
  }
}

async function HandleFilesBatchCompress() {
  const checked = Elements.DetailFilesTableBody.querySelectorAll(".FileRowCheckbox:checked");
  if (checked.length === 0) return;
  const paths = Array.from(checked).map((cb) => cb.dataset.path);

  const archiveName = prompt("Enter archive name (.tar.gz):", "archive.tar.gz");
  if (!archiveName) return;

  Elements.FilesBatchCompressBtn.disabled = true;
  ShowToast("Compressing selected files...", "info");
  try {
    const res = await fetch(`/api/servers/${ActiveDetailServerId}/files/compress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Paths: paths,
        ArchiveName: archiveName.endsWith(".tar.gz") ? archiveName : `${archiveName}.tar.gz`,
      }),
    });
    const json = await res.json();
    if (json.Success) {
      ShowToast("Archive created successfully", "success");
      FetchServerFiles(ActiveDetailServerId, ActiveDetailSubPath);
    } else {
      ShowToast("Compression failed: " + json.Error, "error");
    }
  } catch {
    ShowToast("Network error compressing files", "error");
  } finally {
    Elements.FilesBatchCompressBtn.disabled = false;
  }
}
