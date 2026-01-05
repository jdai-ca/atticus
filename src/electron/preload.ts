import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConversation: (conversation: any) => ipcRenderer.invoke('save-conversation', conversation),
  loadConversations: () => ipcRenderer.invoke('load-conversations'),
  deleteConversation: (conversationId: string) => ipcRenderer.invoke('delete-conversation', conversationId),
  uploadFile: () => ipcRenderer.invoke('upload-file'),
  savePDF: (data: { filename: string; data: string }) => ipcRenderer.invoke('save-pdf', data),
  loadBundledConfig: (configName: string) => ipcRenderer.invoke('load-bundled-config', configName),
  saveBundledConfig: (configName: string, content: string) => ipcRenderer.invoke('save-bundled-config', configName, content),
  fetchFactoryConfig: (configName: string) => ipcRenderer.invoke('fetch-factory-config', configName),
  secureChatRequest: (request: any) => ipcRenderer.invoke('secure-chat-request', request),
  deleteApiKey: (providerId: string) => ipcRenderer.invoke('delete-api-key', providerId),
  convertPdfToImages: (base64Data: string) => ipcRenderer.invoke('convert-pdf-to-images', base64Data),
  convertWordToImages: (base64Data: string) => ipcRenderer.invoke('convert-word-to-images', base64Data),
  convertExcelToImages: (base64Data: string, fileName: string) => ipcRenderer.invoke('convert-excel-to-images', base64Data, fileName),
  convertMarkdownToImages: (base64Data: string) => ipcRenderer.invoke('convert-markdown-to-images', base64Data),
  convertCsvToImages: (base64Data: string, fileName: string) => ipcRenderer.invoke('convert-csv-to-images', base64Data, fileName),
  convertTextToImages: (base64Data: string, fileName: string, extension: string) => ipcRenderer.invoke('convert-text-to-images', base64Data, fileName, extension),
  convertPowerPointToImages: (base64Data: string) => ipcRenderer.invoke('convert-powerpoint-to-images', base64Data),
  convertRtfToImages: (base64Data: string) => ipcRenderer.invoke('convert-rtf-to-images', base64Data),
  convertTiffToImages: (base64Data: string) => ipcRenderer.invoke('convert-tiff-to-images', base64Data),
  convertHeicToImages: (base64Data: string) => ipcRenderer.invoke('convert-heic-to-images', base64Data),
  convertEmailToImages: (base64Data: string, fileName: string) => ipcRenderer.invoke('convert-email-to-images', base64Data, fileName),
  convertEpubToImages: (base64Data: string) => ipcRenderer.invoke('convert-epub-to-images', base64Data),
});
