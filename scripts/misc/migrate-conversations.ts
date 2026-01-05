/**
 * Migration Script: Clean up duplicate conversation files
 * 
 * This script removes old timestamp-based conversation files,
 * keeping only the ID-based files created by the new system.
 * 
 * Run this after updating to the new conversation storage system.
 */

import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

// Add this IPC handler to electron/main.ts if needed
ipcMain.handle('migrate-conversations', async () => {
    try {
        const userDataPath = app.getPath('userData');
        const conversationsDir = path.join(userDataPath, 'conversations');

        if (!fs.existsSync(conversationsDir)) {
            return { success: true, message: 'No conversations directory found' };
        }

        const files = await fs.promises.readdir(conversationsDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        // Group conversations by ID
        const conversationsByID = new Map<string, { file: string; data: any; updatedAt: Date }[]>();

        for (const file of jsonFiles) {
            const filepath = path.join(conversationsDir, file);
            const content = await fs.promises.readFile(filepath, 'utf-8');
            const data = JSON.parse(content);

            if (!conversationsByID.has(data.id)) {
                conversationsByID.set(data.id, []);
            }

            conversationsByID.get(data.id)!.push({
                file,
                data,
                updatedAt: new Date(data.updatedAt)
            });
        }

        let removedCount = 0;
        let keptCount = 0;

        // For each conversation ID, keep only the most recent version
        for (const [id, versions] of conversationsByID) {
            if (versions.length <= 1) {
                keptCount++;
                continue;
            }

            // Sort by updatedAt, most recent first
            versions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            const mostRecent = versions[0];

            // Keep the version with ID-based filename if it exists
            const idBasedVersion = versions.find(v => v.file === `${id}.json`);
            const keepVersion = idBasedVersion || mostRecent;

            // Remove all other versions
            for (const version of versions) {
                if (version.file !== keepVersion.file) {
                    const filepath = path.join(conversationsDir, version.file);
                    await fs.promises.unlink(filepath);
                    removedCount++;
                    console.log(`Removed duplicate: ${version.file}`);
                }
            }

            // If we kept a timestamp file, rename it to ID-based
            if (keepVersion.file !== `${id}.json`) {
                const oldPath = path.join(conversationsDir, keepVersion.file);
                const newPath = path.join(conversationsDir, `${id}.json`);
                await fs.promises.rename(oldPath, newPath);
                console.log(`Renamed ${keepVersion.file} to ${id}.json`);
            }

            keptCount++;
        }

        return {
            success: true,
            message: `Migration complete. Kept ${keptCount} conversations, removed ${removedCount} duplicates.`,
            stats: { kept: keptCount, removed: removedCount }
        };

    } catch (error) {
        console.error('Migration error:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
});

export { };
