import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Utility to handle file downloads across Web and Mobile (Capacitor)
 */
export const downloadFile = async (
    data: string | Blob,
    fileName: string,
    mimeType: string = 'application/octet-stream'
) => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        try {
            let base64Data = '';

            if (typeof data === 'string') {
                // If it's a data URL (like QR Code), extract the base64 part
                if (data.startsWith('data:')) {
                    base64Data = data.split(',')[1];
                } else {
                    base64Data = data;
                }
            } else {
                // Convert Blob to Base64 for Filesystem plugin
                base64Data = await blobToBase64(data);
            }

            // Save to device
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache, // Using Cache for easier sharing
            });

            // Share the file so the user can save it or open it
            await Share.share({
                title: fileName,
                text: `Download complete: ${fileName}`,
                url: savedFile.uri,
                dialogTitle: 'Open or save file',
            });

            return true;
        } catch (error) {
            console.error('Mobile download error:', error);
            throw new Error('Failed to save file to device');
        }
    } else {
        // Web Fallback
        try {
            const url = typeof data === 'string' && data.startsWith('data:')
                ? data
                : URL.createObjectURL(data as Blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (!(typeof data === 'string' && data.startsWith('data:'))) {
                URL.revokeObjectURL(url);
            }
            return true;
        } catch (error) {
            console.error('Web download error:', error);
            throw new Error('Failed to download file');
        }
    }
};

/**
 * Helper to convert Blob to Base64 string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
