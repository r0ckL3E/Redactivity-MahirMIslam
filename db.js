// Define the database name and object store name
const dbName = "RedditCommentDB";
const storeName = "comments";

// Open IndexedDB
const request = indexedDB.open(dbName, 1);

// Event handler for when the database is created or upgraded
request.onupgradeneeded = function(event) {
    let db = event.target.result;
    // Create an object store with "id" as the key path
    db.createObjectStore(storeName, { keyPath: "id" });
};

// Event handler for database errors
request.onerror = function(event) {
    console.error("IndexedDB error:", event.target.error);
};

// Function to save a comment to IndexedDB
function saveComment(comment) {
    // Open the database
    const dbRequest = indexedDB.open(dbName, 1);
    dbRequest.onsuccess = function(event) {
        let db = event.target.result;
        // Start a new transaction
        let tx = db.transaction(storeName, "readwrite");
        let store = tx.objectStore(storeName);
        // Save the comment to the object store
        store.put(comment);
        // When the transaction is complete, log the saved comment and reload the UI
        tx.oncomplete = () => {
            console.log("Comment saved:", comment);
            loadComments(); // Reload UI
        };
    };
}

// Function to load comments from IndexedDB
function loadComments() {
    // Open the database
    const dbRequest = indexedDB.open(dbName, 1);
    dbRequest.onsuccess = function(event) {
        let db = event.target.result;
        // Start a new transaction
        let tx = db.transaction(storeName, "readonly");
        let store = tx.objectStore(storeName);
        // Get all comments from the object store
        let getAll = store.getAll();
        // When the request is successful, display the comments in the UI
        getAll.onsuccess = function() {
            displayComments(getAll.result);
        };
    };
}

// Function to display comments in the UI
function displayComments(comments) {
    // Get the container element for the comments
    const container = document.getElementById("commentsList");
    container.innerHTML = ""; // Clear previous comments

    // Iterate through the comments and create a list item for each comment
    comments.forEach(comment => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <p><strong>Author:</strong> ${comment.author}</p>
            <p><strong>Comment:</strong> ${comment.body}</p>
            <p><strong>Upvotes:</strong> ${comment.ups} | <strong>Downvotes:</strong> ${comment.downs}</p>
            <p><a href="${comment.permalink}" target="_blank">View on Reddit</a></p>
        `;
        // Append the list item to the container
        container.appendChild(listItem);
    });
}