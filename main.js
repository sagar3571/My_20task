const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    Notification
} = require('electron');
const fs = require('fs');
const path = require('path');
const screenshot = require('screenshot-desktop');
const player = require('play-sound')(opts = {});
const {
    GlobalKeyboardListener
} = require("node-global-key-listener");
const FormData = require('form-data');
const {
    json
} = require('stream/consumers');


let mainWindow;
let isTakingScreenshots = false;
let screenshotTimeout;
let keyboardListener = null;

// Variables to track key and mouse counts
let keyCount = 0;
let mouseClickCount = 0;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        maxWidth: 300,
        maxHeight: 550,
        minWidth: 300,
        minHeight: 550,
        width: 300,
        height: 550,
        maximizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    mainWindow.on('close', (e) => {
        if (isTakingScreenshots) {
            e.preventDefault();
            dialog.showMessageBoxSync(mainWindow, {
                type: 'warning',
                buttons: ['OK'],
                title: 'Warning',
                message: 'Please stop the tracker first; after that, you can close it.',
            });
        }
    });
});

let authData = {
    token: null,
    projectId: null,
};

ipcMain.on('set-auth-data', (event, data) => {
    authData.token = data.token;
    authData.projectId = JSON.parse(data.projectId);
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function startTracking() {
    if (isTakingScreenshots && !keyboardListener) {
        keyboardListener = new GlobalKeyboardListener();

        keyCount = 0;
        mouseClickCount = 0;

        keyboardListener.addListener((event) => {
            if (isTakingScreenshots && !event.name.toLowerCase().includes('mouse')) {
                keyCount++;
                console.log(`Key pressed: ${event.name}`);
            }
        });
    }
}

function stopTracking() {
    if (keyboardListener) {
        keyboardListener.kill();
        keyboardListener = null;
    }
}

ipcMain.on('mouse-clicked', () => {
    if (isTakingScreenshots) {
        mouseClickCount++;
        console.log(`Mouse clicked: ${mouseClickCount}`);
    }
});

ipcMain.on('toggle-screenshot', (event, isOn) => {
    if (isOn) {
        startTakingScreenshots();
    } else {
        stopTakingScreenshots();
    }
});

function playVoiceNotification() {
    const soundPath = 'D:/electron-tracker/assets/screen-capture-sound-on-phone-or-pc.mp3';

    player.play(soundPath, function (err) {
        if (err) {
            console.error('Error playing sound:', err);
        } else {
            console.log('Sound played successfully');
        }
    });
}

function startTakingScreenshots() {
    if (isTakingScreenshots) return;

    isTakingScreenshots = true;
    startTracking();

    const localAppDataPath = path.join(app.getPath('appData'), '..', 'Local', 'TimeTrackerConsultantTracker', 'Blob');
    fs.mkdirSync(localAppDataPath, {
        recursive: true
    });

    function takeScreenshot() {
        const screenshotStartTime = new Date(); // Capture start time when screenshot is taken
        const timestamp = screenshotStartTime.toISOString().replace(/[:.]/g, '-');
        const localAppDataPath = path.join(app.getPath('appData'), '..', 'Local', 'TimeTrackerConsultantTracker', 'Blob');
        fs.mkdirSync(localAppDataPath, {
            recursive: true
        });

        screenshot({
                format: 'png',
                screen: 'all'
            })
            .then((imgs) => {
                if (!Array.isArray(imgs)) {
                    imgs = [imgs];
                }

                const mainScreenshotPath = path.join(localAppDataPath, `screenshot-main-${timestamp}.png`);
                const otherScreenshots = [];

                imgs.forEach((img, index) => {
                    const savePath = index === 0 ?
                        mainScreenshotPath :
                        path.join(localAppDataPath, `screenshot-screen${index + 1}-${timestamp}.png`);

                    if (Buffer.isBuffer(img)) {
                        fs.writeFileSync(savePath, img);
                        console.log(`Screenshot saved for screen ${index + 1} at ${savePath}`);

                        if (index === 0) {
                            // Main screen screenshot
                            mainWindow.webContents.send('screenshot-taken', savePath); // Send main screenshot to renderer
                        } else {
                            // Add other screens' paths
                            otherScreenshots.push(savePath);
                        }

                        const notification = new Notification({
                            title: 'Screenshot Taken',
                            body: `Screenshot for screen ${index + 1} saved successfully.`,
                            icon: savePath,
                        });
                        notification.show();
                    } else {
                        console.error(`Error: Image data for screen ${index + 1} is not a buffer.`);
                    }
                });

                playVoiceNotification();
                const screenshotEndTime = new Date(); // Capture end time when screenshot is completed

                uploadScreenshots(mainScreenshotPath, otherScreenshots, screenshotStartTime, screenshotEndTime, authData, keyCount, mouseClickCount);
            })
            .catch((err) => console.error('Error capturing screenshots:', err));

        const randomInterval = Math.floor(Math.random() * (300000 - 60000 + 1)) + 60000;
        console.log(`Next screenshot in ${randomInterval / 1000} seconds`);
        console.log(`Total keys pressed: ${keyCount}`);
        console.log(`Total mouse clicks: ${mouseClickCount}`);
        console.log(`Total screenshots taken: ${keyCount + mouseClickCount}`);
        screenshotTimeout = setTimeout(takeScreenshot, randomInterval);
    }

    takeScreenshot();
}


function stopTakingScreenshots() {
    if (!isTakingScreenshots) return;

    isTakingScreenshots = false;
    clearTimeout(screenshotTimeout);
    stopTracking();

    console.log('Screenshot capturing stopped.');
    console.log(`Final key count: ${keyCount}`);
    console.log(`Final mouse click count: ${mouseClickCount}`);
}

async function uploadScreenshots(mainScreenshotPath, otherScreenshots, screenshotStartTime, screenshotEndTime, authData, keyCount, mouseClickCount) {
    if (!authData.token || !authData.projectId) {
        console.error('Authorization data is missing.');
        return;
    }

    function formatTimeToUTC(dateString) {
        const date = new Date(dateString);

        if (isNaN(date)) {
            console.error('Invalid date string:', dateString);
            return ''; // Return empty string if the date is invalid
        }

        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    }

    const startTimeFormatted = formatTimeToUTC(screenshotStartTime.toISOString());
    const endTimeFormatted = formatTimeToUTC(screenshotEndTime.toISOString());

    try {
        const formData = new FormData();

        // Build logs array
        const logs = [{
            contract_id: 12, // Replace with actual contract ID
            agency_id: null, // If needed, replace with actual agency ID
            memo: 'Test memo',
            start_time: startTimeFormatted,
            end_time: endTimeFormatted,
            date: new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].split('.')[0],
            keys: [{
                key_count: keyCount,
                mouse_count: mouseClickCount,
                datetime: new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].split('.')[0],
            }],
        }];

        if (logs.length === 0) {
            console.error('Logs array is empty. Cannot proceed with uploading.');
            return;
        }

        // Append logs directly as an object (not stringified)
        formData.append('logs', JSON.stringify(logs));

        // Append screenshot files to FormData (if any)
        if (mainScreenshotPath) {
            formData.append('screenshot', fs.createReadStream(mainScreenshotPath));
        }
        otherScreenshots.forEach((screenshotPath, index) => {
            formData.append(`screenshot_${index}`, fs.createReadStream(screenshotPath));
        });

        // Make the HTTP request using node-fetch
        const response = await fetch('https://qa.workitconsultants.in/api/logbooks', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.token}`,
                'Accept': 'application/json',
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Screenshots uploaded successfully:', data);
        } else {
            console.error('Error uploading screenshots. Status:', response.status, await response.text());
        }
    } catch (error) {
        console.error('Error uploading screenshots:', error);
    }
}