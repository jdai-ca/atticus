import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConversation: (conversation: any) => ipcRenderer.invoke('save-conversation', conversation),
  loadConversations: () => ipcRenderer.invoke('load-conversations'),
  uploadFile: () => ipcRenderer.invoke('upload-file'),
  savePDF: (data: { filename: string; data: string }) => ipcRenderer.invoke('save-pdf', data),
  loadBundledConfig: (configName: string) => ipcRenderer.invoke('load-bundled-config', configName),
});
