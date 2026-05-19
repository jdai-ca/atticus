import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig, Conversation, ElectronAPI, SecureChatRequest } from '../types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  saveConfig: (config: AppConfig) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConversation: (conversation: Conversation) => ipcRenderer.invoke('save-conversation', conversation),
  loadConversations: () => ipcRenderer.invoke('load-conversations'),
  deleteConversation: (conversationId: string) => ipcRenderer.invoke('delete-conversation', conversationId),
  uploadFile: () => ipcRenderer.invoke('upload-file'),
  savePDF: (data: { filename: string; data: string }) => ipcRenderer.invoke('save-pdf', data),
  loadBundledConfig: (configName: string) => ipcRenderer.invoke('load-bundled-config', configName),
  saveBundledConfig: (configName: string, content: string) => ipcRenderer.invoke('save-bundled-config', configName, content),
  fetchFactoryConfig: (configName: string) => ipcRenderer.invoke('fetch-factory-config', configName),
  saveApiKey: (providerId: string, apiKey: string) => ipcRenderer.invoke('save-api-key', providerId, apiKey),
  secureChatRequest: (request: SecureChatRequest) => ipcRenderer.invoke('secure-chat-request', request),
  deleteApiKey: (providerId: string) => ipcRenderer.invoke('delete-api-key', providerId),
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
  auditLogAppend: (conversationId: string, entryJson: string) => ipcRenderer.invoke('audit-log-append', conversationId, entryJson),
  auditLogReplace: (conversationId: string, entriesJsonl: string) => ipcRenderer.invoke('audit-log-replace', conversationId, entriesJsonl),
  auditLogRead: (conversationId: string) => ipcRenderer.invoke('audit-log-read', conversationId),
  auditLogList: () => ipcRenderer.invoke('audit-log-list'),
  auditLogDelete: (conversationId: string) => ipcRenderer.invoke('audit-log-delete', conversationId),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
