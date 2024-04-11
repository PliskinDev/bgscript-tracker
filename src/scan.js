import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';

async function main() {
    const maxVersionId = 85;

    async function downloadScripts(platform, directory) {
        for (let version = 1128; version <= 1600; version++) {
            const tasks = [];
            for (let versionId = 0; versionId <= maxVersionId; versionId++) {
                const scriptUrl = `http://prod.cloud.rockstargames.com/titles/rdr2/${platform}/bgscripts/bg_ng_${version}_${versionId}.rpf`;
                const scriptName = `bg_ng_${version}_${versionId}`;
                tasks.push(downloadScript(scriptUrl, scriptName, directory, platform, version, versionId));
            }
            await Promise.all(tasks);
        }
    }

    async function downloadScript(url, scriptName, directory, platform, version, versionId) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status !== 404) {
                    console.error(`Oops! Failed to fetch script: ${response.status} @ ${url}`);
                }
                return;
            }

            const content = await response.arrayBuffer();

            const lastModifiedHeader = response.headers.get('last-modified');
            const lastModified = DateTime.fromJSDate(new Date(lastModifiedHeader));

            const contentBuffer = Buffer.from(content);
            const sha256Hash = crypto.createHash('sha256').update(contentBuffer).digest('hex');

            const modifiedDateFormatted = lastModified.toFormat('yyyy-MM-dd');
            const modifiedDayName = lastModified.toFormat('EEEE');

            const bgScriptRpf = `${modifiedDateFormatted}_${sha256Hash}.rpf`;

            const bgScriptName = `bg_ng_${version}_${versionId}`;
            const bgScriptPath = path.join(directory, platform, bgScriptName);
            await fs.mkdir(bgScriptPath, { recursive: true });
            const scriptPath = path.join(bgScriptPath, bgScriptRpf);
            await fs.writeFile(scriptPath, Buffer.from(content));

            const lastModifiedPath = path.join(bgScriptPath, 'last.modified.txt');
            const formattedDate = `${modifiedDayName}, ${lastModified.toLocaleString({ month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} GMT`;
            const fileContent = `${formattedDate}`;
            await fs.appendFile(lastModifiedPath, fileContent + '\n');

            console.log(`Success! Script ${scriptFileName} downloaded for ${platform}.`);

            return content;
        } catch (error) {
            console.error(`Oops! Error downloading ${scriptName} for ${platform}: ${error}`);
            throw error;
        }
    }

    const platforms = ["pcros"];
    const baseDir = `./`;

    await Promise.all(platforms.map(async platform => {
        try {
            const bgScriptsDir = path.resolve(baseDir, 'bgscripts');
            await fs.mkdir(bgScriptsDir, { recursive: true });
            await downloadScripts(platform, bgScriptsDir);
        } catch (error) {
            console.error(error);
        }
    }));
}

main().catch(error => console.error(error));
