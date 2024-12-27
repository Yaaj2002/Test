// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getDatabase, ref, set, push, get, update, remove } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { firebaseConfig } from "./server.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Get DOM elements
const loginFormContainer = document.getElementById("login-form-container");
const signupFormContainer = document.getElementById("signup-form-container");
const addPlateContainer = document.getElementById("add-plate-container");
const plateInventoryTable = document.getElementById("plate-inventory");
const addPlateBtn = document.getElementById("add-plate-btn");
const closeFormBtn = document.getElementById("close-form-btn");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const showSignupFormBtn = document.getElementById("show-signup-form");
const submitFormBtn = document.getElementById("submit-form-btn");
const deleteBtn = document.getElementById("delete-btn");
const searchBar = document.getElementById("search-bar");

let loggedIn = false;
let userData = {}; // Placeholder for storing user data
let currentPlateId = null; // Store the current plate ID for editing

// Function to show the appropriate form
function showLoginForm() {
    loginFormContainer.style.display = 'block';
    signupFormContainer.style.display = 'none';
    addPlateContainer.style.display = 'none';
}

// Function to show signup form
function showSignupForm() {
    loginFormContainer.style.display = 'none';
    signupFormContainer.style.display = 'block';
    addPlateContainer.style.display = 'none';
}

// Function to show the add plate form (used for both adding and editing)
function showAddPlateForm() {
    addPlateContainer.style.display = 'block';
    loginFormContainer.style.display = 'none';
    signupFormContainer.style.display = 'none';

    if (currentPlateId) {
        deleteBtn.style.display = 'inline-block'; // Show delete button when editing
    } else {
        deleteBtn.style.display = 'none'; // Hide delete button when adding
    }
}

// Function to log in the user with Firebase Authentication
function loginUser() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (username && password) {
        signInWithEmailAndPassword(auth, username, password)
            .then(userCredential => {
                loggedIn = true;
                userData = userCredential.user;
                alert("Login successful!");
                loginFormContainer.style.display = "none";
                addPlateContainer.style.display = "block";
                deleteBtn.style.display = "none";
                loadPlateInventory(); // Load the plate inventory after login
            })
            .catch(error => {
                alert("Error logging in: " + error.message);
            });
    } else {
        alert("Please enter a valid username and password.");
    }
}

// Function to sign up the user with Firebase Authentication
function signupUser() {
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    if (username && password) {
        createUserWithEmailAndPassword(auth, username, password)
            .then(userCredential => {
                alert("Signup successful!");
                showLoginForm();
            })
            .catch(error => {
                alert("Error signing up: " + error.message);
            });
    } else {
        alert("Please enter a valid username and password.");
    }
}

// Function to load plate inventory with sorting
function loadPlateInventory() {
    const platesRef = ref(db, 'plates');

    get(platesRef)
        .then(snapshot => {
            if (snapshot.exists()) {
                const plates = snapshot.val();

                // Clear current rows in the table (except the header)
                const rows = plateInventoryTable.getElementsByTagName('tr');
                for (let i = rows.length - 1; i > 0; i--) {
                    plateInventoryTable.deleteRow(i);
                }

                // Sort plates alphabetically by productName (or partNumber)
                const sortedPlates = Object.keys(plates).map(plateId => {
                    return { id: plateId, ...plates[plateId] };
                }).sort((a, b) => {
                    // Sort by productName alphabetically (case-insensitive)
                    return a.productName.toLowerCase().localeCompare(b.productName.toLowerCase());
                });

                // Populate table with sorted plates
                sortedPlates.forEach(plate => {
                    const newRow = plateInventoryTable.insertRow();
                    newRow.insertCell(0).innerText = plate.partNumber;
                    newRow.insertCell(1).innerText = plate.productName;
                    newRow.insertCell(2).innerText = plate.plateLocation;
                    newRow.insertCell(3).innerText = plate.customerName;
                    newRow.insertCell(4).innerText = plate.personSaved;

                    // Add event listener for editing plate
                    newRow.addEventListener('click', function () {
                        currentPlateId = plate.id;
                        document.getElementById("part-number").value = plate.partNumber;
                        document.getElementById("product-name").value = plate.productName;
                        document.getElementById("plate-location").value = plate.plateLocation;
                        document.getElementById("customer-name").value = plate.customerName;
                        document.getElementById("person-saved").value = plate.personSaved;

                        showAddPlateForm(); // Show the form with current plate data
                    });
                });
            } else {
                alert("No plates available in the database.");
            }
        })
        .catch(error => {
            alert("Error fetching plates: " + error.message);
        });
}

// Function to delete the current plate
function deletePlate() {
    if (currentPlateId) {
        const plateRef = ref(db, 'plates/' + currentPlateId);
        remove(plateRef)
            .then(() => {
                alert("Plate deleted successfully!");
                currentPlateId = null;
                loadPlateInventory(); // Refresh the inventory table
                addPlateContainer.style.display = 'none';
            })
            .catch(error => {
                alert("Error deleting plate: " + error.message);
            });
    }
}

// Function to submit the add plate form to Firebase Realtime Database (used for both add and edit)
function submitPlateForm(event) {
    event.preventDefault(); // Prevent form from reloading the page

    const partNumber = document.getElementById("part-number").value;
    const productName = document.getElementById("product-name").value;
    const plateLocation = document.getElementById("plate-location").value;
    const customerName = document.getElementById("customer-name").value;
    const personSaved = document.getElementById("person-saved").value;

    const platesRef = ref(db, 'plates');

    if (currentPlateId) {
        // Update the existing plate
        const plateRef = ref(db, 'plates/' + currentPlateId);
        update(plateRef, {
            partNumber: partNumber,
            productName: productName,
            plateLocation: plateLocation,
            customerName: customerName,
            personSaved: personSaved
        })
            .then(() => {
                alert("Plate updated successfully!");
                loadPlateInventory();  // Refresh the inventory table
            })
            .catch(error => {
                alert("Error updating plate: " + error.message);
            });
    } else {
        // Add new plate
        const newPlateRef = push(platesRef);
        set(newPlateRef, {
            partNumber: partNumber,
            productName: productName,
            plateLocation: plateLocation,
            customerName: customerName,
            personSaved: personSaved
        })
            .then(() => {
                alert("Plate added successfully!");
                loadPlateInventory();  // Refresh the inventory table
            })
            .catch(error => {
                alert("Error adding plate: " + error.message);
            });
    }

    // Clear form fields after submission
    document.getElementById("part-number").value = "";
    document.getElementById("product-name").value = "";
    document.getElementById("plate-location").value = "";
    document.getElementById("customer-name").value = "";
    document.getElementById("person-saved").value = "";

    // Reset current plate ID after submission
    currentPlateId = null;
    addPlateContainer.style.display = 'none';
}

// Function to filter the table based on the search bar
function filterPlateInventory() {
    const searchQuery = searchBar.value.toLowerCase();
    const rows = plateInventoryTable.getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) { // Skip the header row
        const cells = rows[i].getElementsByTagName('td');
        let matchFound = false;
        for (let j = 0; j < cells.length; j++) {
            if (cells[j].innerText.toLowerCase().includes(searchQuery)) {
                matchFound = true;
                break;
            }
        }
        rows[i].style.display = matchFound ? '' : 'none';
    }
}

// Event listeners
loginBtn.addEventListener("click", (event) => {
    event.preventDefault();
    loginUser();
});

signupBtn.addEventListener("click", (event) => {
    event.preventDefault();
    signupUser();
});

showSignupFormBtn.addEventListener("click", (event) => {
    event.preventDefault();
    showSignupForm();
});

addPlateBtn.addEventListener("click", (event) => {
    event.preventDefault();
    showAddPlateForm();
});

closeFormBtn.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("part-number").value = "";
    document.getElementById("product-name").value = "";
    document.getElementById("plate-location").value = "";
    document.getElementById("customer-name").value = "";
    document.getElementById("person-saved").value = "";
    currentPlateId = null;
    addPlateContainer.style.display = 'none';
});

submitFormBtn.addEventListener("click", submitPlateForm);

deleteBtn.addEventListener("click", (event) => {
    event.preventDefault();
    deletePlate();
});

searchBar.addEventListener("input", filterPlateInventory);

// Initially show login form
showLoginForm();
