const API_BASE = "http://localhost:5000/api";
const SERVER_BASE = "http://localhost:5000";

const tokenKey = "blogToken";
const userKey = "blogUser";

let currentUser = JSON.parse(localStorage.getItem(userKey) || "null");
let socket = null;

const $ = (id) => document.getElementById(id);

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setSession(token, user) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  currentUser = user;
}

function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  currentUser = null;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `message ${type}`;
}

async function apiRequest(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearSession();
    showAuth();
    throw new Error(data.message || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

function showRegister() {
  $("loginBox").classList.add("hidden");
  $("registerBox").classList.remove("hidden");
  $("authTitle").textContent = "Create your account";
  $("authSubtitle").textContent = "A simple place to share posts and join conversations.";
  $("authMessage").textContent = "";
}

function showLogin() {
  $("registerBox").classList.add("hidden");
  $("loginBox").classList.remove("hidden");
  $("authTitle").textContent = "Welcome back";
  $("authSubtitle").textContent = "Sign in to share your thoughts and see what others are posting.";
  $("authMessage").textContent = "";
}

function showApp() {
  $("authContainer").classList.add("hidden");
  $("appContainer").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");

  const username = currentUser?.username || "User";
  $("userWelcome").textContent = `Hi, ${username}`;
  $("sidebarUsername").textContent = username;
  $("avatar").textContent = username.charAt(0).toUpperCase();
}

function showAuth() {
  $("appContainer").classList.add("hidden");
  $("authContainer").classList.remove("hidden");
  $("logoutBtn").classList.add("hidden");
  $("userWelcome").textContent = "";
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

async function register(event) {
  event.preventDefault();

  const username = $("registerUsername").value.trim();
  const email = $("registerEmail").value.trim();
  const password = $("registerPassword").value;

  try {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    showMessage($("authMessage"), data.message, "success");
    $("registerForm").reset();
    showLogin();
    $("loginEmail").value = email;
  } catch (error) {
    showMessage($("authMessage"), error.message, "error");
  }
}

async function login(event) {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    setSession(data.token, data.user);
    $("loginForm").reset();
    showApp();
    await loadPosts();
    connectSocket();
  } catch (error) {
    showMessage($("authMessage"), error.message, "error");
  }
}

function logout() {
  clearSession();
  $("postsContainer").innerHTML = "";
  showAuth();
  showLogin();
}

async function createPost(event) {
  event.preventDefault();

  const caption = $("caption").value.trim();
  const file = $("mediaInput").files[0];

  if (!file) {
    showMessage($("postMessage"), "Please select an image or video.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("caption", caption);
  formData.append("media", file);

  try {
    $("postMessage").textContent = "Publishing...";
    await apiRequest("/posts", {
      method: "POST",
      body: formData
    });

    $("postForm").reset();
    showMessage($("postMessage"), "Post published.", "success");
    await loadPosts();
  } catch (error) {
    showMessage($("postMessage"), error.message, "error");
  }
}

async function loadPosts() {
  try {
    const posts = await apiRequest("/posts");
    renderPosts(posts);
  } catch (error) {
    console.error(error);
  }
}

function renderPosts(posts) {
  const container = $("postsContainer");
  container.innerHTML = "";

  $("emptyState").classList.toggle("hidden", posts.length !== 0);

  posts.forEach(post => {
    container.appendChild(createPostElement(post));
  });
}

function createPostElement(post) {
  const article = document.createElement("article");
  article.className = "post card";
  article.dataset.postId = post.id;

  const media = post.media_type === "image"
    ? `<img src="${SERVER_BASE}${post.media_url}" alt="Post image" loading="lazy">`
    : `<video controls preload="metadata"><source src="${SERVER_BASE}${post.media_url}" type="video/mp4">Your browser does not support video.</video>`;

  const comments = (post.comments || []).map(comment => commentHtml(comment)).join("");
  const isOwner = currentUser && Number(currentUser.id) === Number(post.user_id);

  article.innerHTML = `
    <div class="post-author">
      <div class="avatar small">${escapeHtml(post.username.charAt(0).toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(post.username)}</strong>
        <span>${formatDate(post.created_at)}</span>
      </div>
      ${isOwner ? `<button class="icon-btn delete-post" title="Delete post">Delete</button>` : ""}
    </div>

    ${media}

    <div class="post-content">
      ${post.caption ? `<p class="caption">${escapeHtml(post.caption)}</p>` : ""}

      <div class="actions">
        <button class="action-btn like-btn ${post.liked_by_me ? "liked" : ""}">
          ${post.liked_by_me ? "♥" : "♡"} <span>${post.likes}</span>
        </button>
        <span class="comment-count">${post.comments?.length || 0} comments</span>
      </div>

      <div class="comment-box">
        <input class="comment-input" type="text" maxlength="500" placeholder="Write a comment...">
        <button class="comment-btn">Comment</button>
      </div>
      <div class="comments">${comments}</div>
    </div>
  `;

  article.querySelector(".like-btn").addEventListener("click", () => toggleLike(post.id));
  article.querySelector(".comment-btn").addEventListener("click", () => addComment(post.id));

  const deleteButton = article.querySelector(".delete-post");
  if (deleteButton) {
    deleteButton.addEventListener("click", () => deletePost(post.id));
  }

  return article;
}

function commentHtml(comment) {
  return `
    <div class="comment">
      <strong>${escapeHtml(comment.username)}</strong>
      <p>${escapeHtml(comment.content)}</p>
    </div>
  `;
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

async function toggleLike(postId) {
  try {
    await apiRequest(`/posts/${postId}/like`, { method: "POST" });
  } catch (error) {
    alert(error.message);
  }
}

async function deletePost(postId) {
  if (!confirm("Delete this post?")) return;

  try {
    await apiRequest(`/posts/${postId}`, { method: "DELETE" });
  } catch (error) {
    alert(error.message);
  }
}

async function addComment(postId) {
  const article = document.querySelector(`[data-post-id="${postId}"]`);
  const input = article.querySelector(".comment-input");
  const content = input.value.trim();

  if (!content) return;

  try {
    await apiRequest(`/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    input.value = "";
  } catch (error) {
    alert(error.message);
  }
}

function connectSocket() {
  if (socket) socket.disconnect();

  socket = io(SERVER_BASE, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    $("connectionStatus").textContent = "Live updates on";
    $("connectionStatus").classList.add("online");
  });

  socket.on("disconnect", () => {
    $("connectionStatus").textContent = "Reconnecting...";
    $("connectionStatus").classList.remove("online");
  });

  socket.on("postCreated", (post) => {
    const existing = document.querySelector(`[data-post-id="${post.id}"]`);
    if (existing) return;
    loadPosts();
  });

  socket.on("postDeleted", ({ postId }) => {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    if (post) post.remove();
    const remaining = document.querySelectorAll("#postsContainer .post").length;
    $("emptyState").classList.toggle("hidden", remaining !== 0);
  });

  socket.on("likeUpdated", ({ postId, likes }) => {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    if (!post) return;
    const count = post.querySelector(".like-btn span");
    if (count) count.textContent = likes;
  });

  socket.on("commentAdded", (comment) => {
    const post = document.querySelector(`[data-post-id="${comment.post_id}"]`);
    if (!post) return;

    const comments = post.querySelector(".comments");
    comments.insertAdjacentHTML("beforeend", commentHtml(comment));

    const count = post.querySelector(".comment-count");
    const current = Number(count.textContent.split(" ")[0] || 0);
    count.textContent = `${current + 1} comments`;
  });
}

$("showRegisterBtn").addEventListener("click", showRegister);
$("showLoginBtn").addEventListener("click", showLogin);
$("registerForm").addEventListener("submit", register);
$("loginForm").addEventListener("submit", login);
$("postForm").addEventListener("submit", createPost);
$("logoutBtn").addEventListener("click", logout);

(async function init() {
  if (!getToken()) {
    showAuth();
    return;
  }

  try {
    const user = await apiRequest("/auth/me");
    currentUser = user;
    localStorage.setItem(userKey, JSON.stringify(user));
    showApp();
    await loadPosts();
    connectSocket();
  } catch (error) {
    clearSession();
    showAuth();
  }
})();
