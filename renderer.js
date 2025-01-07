const axios = require('axios');

// Check if token exists in localStorage
const token = localStorage.getItem('token');
const loginForm = document.getElementById('login-form');
const dataDiv = document.querySelector('#allShowProjectData');
const showProjectPerticularData = document.querySelector('#showProjectPerticularData');
const footerLoginNotShow = document.querySelector('#footerLoginNotShow');
const loader = document.getElementById('loader');
const messageElement = document.getElementById('message');

// If token exists, hide login form and show project data
if (token) {
    loginForm.style.display = 'none';
    dataDiv.style.display = 'block';
    showProjectPerticularData.style.display = 'block';
    footerLoginNotShow.style.display = 'block';
}

const storedFirstName = localStorage.getItem('userFirstName');
if (storedFirstName) {
    document.getElementById('userFirstName').textContent = storedFirstName;
}

// Handle login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Clear previous messages
    messageElement.textContent = '';
    messageElement.classList.remove('text-red-600', 'text-green-600'); // Reset text classes

    // Show loader
    loader.classList.remove('hidden');

    try {
        const response = await axios.post('https://qa.workitconsultants.in/api/login', {
            email,
            password
        });

        // Store response token in localStorage
        localStorage.setItem('token', response.data.token); // Save the token

        const firstName = response.data.first_name; // Assuming first_name is part of the response
        localStorage.setItem('userFirstName', firstName); // Store the first name

        // Show user's first name in the UI
        document.getElementById('userFirstName').textContent = firstName;



        // Handle success response
        messageElement.textContent = `Login successful: ${response.data.message}`;
        messageElement.classList.add('text-green-600'); // Success message in green
        console.log('Response stored in localStorage:', response.data);

        // Hide login form and show data div
        loginForm.style.display = 'none';
        dataDiv.style.display = 'block';
        showProjectPerticularData.style.display = 'block';
        footerLoginNotShow.style.display = 'block';
        fetchContracts();
    } catch (error) {
        // Handle error response
        const errorMessage = error.response?.data?.message || 'An error occurred during login.';

        // Show error message
        messageElement.textContent = errorMessage;
        messageElement.classList.add('text-red-600'); // Error message in red
        console.error(errorMessage);
    } finally {
        // Hide loader
        loader.classList.add('hidden');
    }
});

// Handle logout button
document.getElementById('logout-btn').addEventListener('click', async () => {
    const token = localStorage.getItem('token'); // Get the stored token
    const messageElement = document.getElementById('message');
    const loader = document.getElementById('loader');

    if (token) {
        // Show loader while logging out
        loader.classList.remove('hidden');

        try {
            // Make API call to logout
            const response = await axios.post('https://qa.workitconsultants.in/api/logout', {}, {
                headers: {
                    'Authorization': `Bearer ${token}` // Send the token in the Authorization header
                }
            });

            // Handle success response
            console.log('Logout successful:', response.data);
            localStorage.removeItem('token'); // Remove the token from localStorage
            localStorage.removeItem('userFirstName'); // Remove the token from localStorage

            // Hide project data and show login form
            loginForm.style.display = 'block';
            dataDiv.style.display = 'none';
            footerLoginNotShow.style.display = 'none';
            messageElement.textContent = 'You have logged out successfully.';
            messageElement.classList.add('text-green-600'); // Success message in green
        } catch (error) {
            // Handle error response
            const errorMessage = error.response?.data?.message || 'An error occurred during logout.';
            console.error(errorMessage);
            messageElement.textContent = errorMessage;
            messageElement.classList.add('text-red-600'); // Error message in red
        } finally {
            // Hide loader
            loader.classList.add('hidden');
        }
    }
});

// On page load, check if user is already logged in
window.onload = () => {
    const storedFirstName = localStorage.getItem('userFirstName');
    if (storedFirstName) {
        document.getElementById('userFirstName').textContent = storedFirstName;
    }
};