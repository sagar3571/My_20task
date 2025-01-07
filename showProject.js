const {
    ipcRenderer
} = require('electron');

// Function to show the loader and hide it once the data is loaded
function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

// Listen for the screenshot-taken event
ipcRenderer.on('screenshot-taken', (event, filePath) => {
    const screenshotImg = document.getElementById('latestScreenshotImg');
    if (screenshotImg) {
        screenshotImg.src = filePath; // Update the image source
    }
});

function convertMinutesToHours(minutes) {
    if (minutes === null || minutes === undefined) {
        return "00:00";
    }
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0'); // Ensure two digits for hours
    const remainingMinutes = (minutes % 60).toString().padStart(2, '0'); // Ensure two digits for minutes
    return `${hours}:${remainingMinutes}`;
}


// Function to fetch data from the API and update the UI
async function fetchContracts(searchQuery = '') {
    toggleLoader(true);

    const token = localStorage.getItem('token');
    // if (!token) {
    //     alert('No token found. Please log in again.');
    //     return;
    // }

    try {
        // Add searchQuery as a query parameter
        const response = await fetch(`https://qa.workitconsultants.in/api/contracts?search=${encodeURIComponent(searchQuery)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch contracts');
        }

        const data = await response.json();
        const contracts = data.contracts;

        const container = document.getElementById('allShowProjectMultipleData');
        container.innerHTML = '';

        contracts.forEach(contract => {
            const contractDiv = document.createElement('div');
            contractDiv.classList.add('container', 'max-w-md', 'mx-auto', 'p-3', 'border-b', 'border-gray-300');

            contractDiv.innerHTML = `
                <div class="d-flex justify-between">
                    <div class="col-9">
                        <h4 class="text-sm truncate w-full">${contract.title || 'Project Name'}</h4>
                    </div>
                    <div class="col-3 my-auto text-end">
                        <label class="text-sm" for="progress">${convertMinutesToHours(contract.working_minutes_of_this_day)}</label>
                    </div>
                </div>
                <div class="progress h-2" role="progressbar" aria-label="Basic example" aria-valuenow="${contract.working_minutes_of_this_week || 0}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar" style="width: ${((contract.working_minutes_of_this_week || 0) / (contract.weekly_hours * 60)) * 100}%"></div>
                </div>
                <div class="d-flex justify-between">
                    <div class="col-8">
                        <h4 class="text-sm truncate w-full">${contract.client.first_name} ${contract.client.last_name}</h4>
                    </div>
                    <div class="col-4 my-auto text-end">
                        <div class="text-sm">Of ${contract.weekly_hours} hours</div>
                    </div>
                </div>
            `;
            contractDiv.addEventListener('click', () => showProject(contract));

            container.appendChild(contractDiv);
        });

        container.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching contracts:', error);
    } finally {
        toggleLoader(false);
    }
}

// Event listener for search input
document.getElementById('allProjetSearch').addEventListener('input', function () {
    const searchQuery = this.value.trim(); // Get the search query
    fetchContracts(searchQuery); // Call fetchContracts with the search query
});

// Call the function to fetch contracts on page load
window.onload = () => fetchContracts();


function showProject(data) {
    localStorage.setItem('projectId', JSON.stringify(data));
    const allShowProjectData = document.getElementById('allShowProjectData');
    const allShowProjectMultipleData = document.getElementById('allShowProjectMultipleData');
    const detailsDiv = document.getElementById('showProjectPerticularData');
    const hiddenSearchGetData = document.getElementById('hiddenSearchGetData');

    // Hide the 'allShowProjectData' div
    if (allShowProjectData) {
        allShowProjectData.classList.add('hidden');
        allShowProjectMultipleData.classList.add('hidden');
        hiddenSearchGetData.classList.add('hidden');
    }

    // Show the 'showProjectPerticularData' div
    if (detailsDiv) {
        detailsDiv.classList.remove('hidden');
    }

    // Populate the 'showProjectPerticularData' div with project details
    if (detailsDiv) {
        detailsDiv.innerHTML = `
        <div class="container max-w-md mx-auto px-3 py-2 border-b border-gray-300">
            <div class="d-flex justify-between">
                <i class="fa-regular fa-circle-left text-md text-blue-500 my-auto pt-1" id="backButtonAllProject"></i>
                <h1 class="text-md font-bold my-auto w-full truncate-text ms-2">${data.title}</h1>
            </div>
            <div class="text-start text-sm my-auto ms-4">${data.client.first_name} ${data.client.last_name}</div>
        </div>
        <div class="container max-w-md mx-auto px-3 py-2">
            <div class="d-flex justify-between">
                <div class="text-md my-auto">10 hrs 11 min</div>
                <div class="form-check form-switch text-end m-0">
                    <input class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckProject">
                </div>
            </div>
            <div class="d-flex justify-between">
                <div class="text-[11px] my-auto">Current Session</div>
                <div class="text-[11px] my-auto">${convertMinutesToHours(data.working_minutes_of_this_week || 0)} of ${data.weekly_hours} hrs</div>
            </div>
            <div class="text-[13px] my-auto mt-2">10:27 hrs</div>
            <div id="todayDateName" class="text-[13px] my-auto">today (${getTodayName()} IST)</div>

            <h6 class="font-bold my-auto mt-3">Memo</h6>
            <input type="text" id="MemoData"
                class="form-control w-full mt-1 ps-2 pe-[2.2rem] py-0.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                placeholder="what are you looking on?">

            <div class="card mt-4" id="card">
                <img id="latestScreenshotImg"
                    src="https://img.freepik.com/premium-vector/no-photo-available-vector-icon-default-image-symbol-picture-coming-soon-web-site-mobile-app_87543-10615.jpg"
                    alt="Latest Screenshot">
            </div>

            <div class="d-flex justify-between mt-[33px]">
                <a href="https://qa.workitconsultants.in/dashboard/logbooks?contract=${data.id}" 
                    class="text-sm my-auto text-blue-500" target="_blank" rel="noopener noreferrer">View Work Diary</a>
                <div class="text-sm my-auto text-gray-400">Add Manual Time</div>
            </div>
        </div>
        `;

        const backButton = document.getElementById('backButtonAllProject');
        backButton.addEventListener('click', () => backToAllProject());

        document.getElementById('flexSwitchCheckProject').addEventListener('change', (event) => {
            const isOn = event.target.checked; // Assuming a checkbox or toggle switch
            ipcRenderer.send('toggle-screenshot', isOn); // Send the toggle state to the main process
        });

        const token = localStorage.getItem('token');
        const projectId = localStorage.getItem('projectId');

        ipcRenderer.send('set-auth-data', {
            token,
            projectId
        });
    }
}

function getTodayName() {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = new Date();
    return days[today.getDay()];
}


function backToAllProject() {
    const allShowProjectData = document.getElementById('allShowProjectData');
    const allShowProjectMultipleData = document.getElementById('allShowProjectMultipleData');
    const hiddenSearchGetData = document.getElementById('hiddenSearchGetData');
    const detailsDiv = document.getElementById('showProjectPerticularData');

    const switchProject = document.getElementById('flexSwitchCheckProject');
    if (!switchProject.checked) {
        if (allShowProjectData) {
            allShowProjectData.classList.remove('hidden');
        }
        if (allShowProjectMultipleData) {
            allShowProjectMultipleData.classList.remove('hidden');
        }
        if (hiddenSearchGetData) {
            hiddenSearchGetData.classList.remove('hidden');
        }
        if (detailsDiv) {
            detailsDiv.classList.add('hidden');
            window.location.reload();
            localStorage.removeItem('projectId');
        }
    } else if (switchProject.checked) {
        alert('Please stop the tracker first; after that, you can go back.');
    }
}