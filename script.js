// Global variables to store subreddit, post ID, and comment ID
let storedSubreddit = "";
let storedPostId = "";
let storedCommentId = "";

// Event listener for the "Fetch Comment" button
document.getElementById("fetchComment").addEventListener("click", function() {
    // Get the comment URL from the input field and trim any whitespace
    const commentUrl = document.getElementById("commentUrl").value.trim();
    // Use a regular expression to extract subreddit, post ID, and comment ID from the URL
    const match = commentUrl.match(/reddit\.com\/r\/([^/]+)\/comments\/([^/]+)\/([^/]+)\/([^/]+)/);

    // If the URL is invalid, show an alert and return
    if (!match) {
        alert("Invalid Reddit comment URL!");
        return;
    }

    // Store the extracted values in global variables
    storedSubreddit = match[1];
    storedPostId = match[2];
    storedCommentId = match[4];

    // Fetch the comment using the extracted values
    fetchComment(storedSubreddit, storedPostId, storedCommentId);
});

// Event listener for the "Refresh All Comments" button
document.getElementById("refreshAllComments").addEventListener("click", function() {
    refreshComments();
});

// Function to fetch a comment from Reddit
function fetchComment(subreddit, postId, commentId) {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`;

    fetch(url)
        .then(response => {
            // If the response is not OK, throw an error
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Reddit API Response:", data);

            // Find the specific comment in the response data
            const comment = findComment(data, commentId);
            if (!comment) {
                // If the comment is not found, update its status to "Inactive"
                alert("No comment found.");
                updateCommentStatus(commentId, "Inactive");
                return;
            }

            console.log("Extracted comment data:", comment);

            // Create an object with the comment details
            const commentDetails = {
                id: comment.id,
                subreddit: subreddit,
                postId: postId,
                commentId: commentId,
                author: comment.author,
                body: comment.body || "No content", // Fallback to "No content" if body is undefined
                created_utc: new Date(comment.created_utc * 1000).toLocaleString(),
                permalink: `https://www.reddit.com${comment.permalink}`,
                ups: comment.ups,
                downs: comment.downs
            };

            console.log("Comment details:", commentDetails);

            // Save the comment details to IndexedDB
            saveComment(commentDetails);
            // Display the comment in the UI
            displayComments([commentDetails]);
        })
        .catch(error => console.error("Error fetching comment:", error));
}

// Function to find a specific comment in the Reddit API response data
function findComment(data, commentId) {
    for (const comment of data[1].data.children) {
        if (comment.data.id === commentId) {
            return comment.data;
        }
    }
    return null;
}

// Function to display comments in the UI
function displayComments(comments) {
    const container = document.getElementById("commentsList");
    container.innerHTML = ""; // Clear previous comments

    comments.forEach(comment => {
        // Determine the status color and text based on the comment's status
        const statusColor = comment.status === "Inactive" ? "red" : "green";
        const statusText = comment.status === "Inactive" ? "Inactive" : "Active";

        // Create a list item for each comment
        const listItem = document.createElement('li');
        listItem.className = 'comment-card';
        listItem.innerHTML = `
            <p class="author"><strong>Author:</strong> ${comment.author}</p>
            <p><strong>Comment:</strong> ${comment.body}</p>
            <p class="upvotes"><strong>⬆ ${comment.ups} ⬇</strong></p>
            <p><a href="${comment.permalink}" target="_blank">View on Reddit</a></p>
            <p class="status" style="color: ${statusColor};"><strong>${statusText}</strong></p>
            <button class="refresh-comment" data-subreddit="${comment.subreddit}" data-postid="${comment.postId}" data-commentid="${comment.commentId}">Refresh Comment</button>
            <button class="delete-comment" data-commentid="${comment.commentId}">Delete Comment</button>
        `;
        container.appendChild(listItem);
    });

    // Add event listeners to the refresh buttons
    document.querySelectorAll('.refresh-comment').forEach(button => {
        button.addEventListener('click', function() {
            const subreddit = this.getAttribute('data-subreddit');
            const postId = this.getAttribute('data-postid');
            const commentId = this.getAttribute('data-commentid');
            fetchComment(subreddit, postId, commentId);
        });
    });

    // Add event listeners to the delete buttons
    document.querySelectorAll('.delete-comment').forEach(button => {
        button.addEventListener('click', function() {
            const commentId = this.getAttribute('data-commentid');
            deleteComment(commentId);
        });
    });
}

// Function to update the status of a comment in IndexedDB
function updateCommentStatus(commentId, status) {
    const dbRequest = indexedDB.open(dbName, 1);
    dbRequest.onsuccess = function(event) {
        let db = event.target.result;
        let tx = db.transaction(storeName, "readwrite");
        let store = tx.objectStore(storeName);
        let getRequest = store.get(commentId);
        getRequest.onsuccess = function() {
            let comment = getRequest.result;
            if (comment) {
                comment.status = status;
                store.put(comment);
                loadComments(); // Reload UI
            }
        };
    };
}

// Function to delete a comment from IndexedDB
function deleteComment(commentId) {
    const dbRequest = indexedDB.open(dbName, 1);
    dbRequest.onsuccess = function(event) {
        let db = event.target.result;
        let tx = db.transaction(storeName, "readwrite");
        let store = tx.objectStore(storeName);
        store.delete(commentId);
        tx.oncomplete = () => {
            console.log("Comment deleted:", commentId);
            loadComments(); // Reload UI
        };
    };
}

// Load and display previously stored comments when the page is loaded
window.onload = function() {
    console.log('Page loaded. Fetching stored comments.');
    loadComments();
};

// Function to refresh all comments by fetching the latest data from Reddit
function refreshComments() {
    const dbRequest = indexedDB.open(dbName, 1);
    dbRequest.onsuccess = function(event) {
        let db = event.target.result;
        let tx = db.transaction(storeName, "readonly");
        let store = tx.objectStore(storeName);
        let getAll = store.getAll();
        getAll.onsuccess = function() {
            const comments = getAll.result;
            comments.forEach(comment => {
                fetchComment(comment.subreddit, comment.postId, comment.commentId);
            });
        };
    };
}