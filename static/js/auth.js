/**
 * auth.js — JWT authentication helpers for Chess Online
 * Add this script to any page that needs to make authenticated API requests.
 */

const Auth = {
    /**
     * Get the stored JWT token.
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem('chess_token');
    },

    /**
     * Get the stored user object.
     * @returns {object|null}
     */
    getUser() {
        const raw = localStorage.getItem('chess_user');
        return raw ? JSON.parse(raw) : null;
    },

    /**
     * Returns true if a token exists in storage.
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.getToken();
    },

    /**
     * Clear auth data and redirect to login.
     * @param {boolean} [redirect=true]
     */
    logout(redirect = true) {
        fetch('/auth/logout', { method: 'POST' }).catch(() => {});
        localStorage.removeItem('chess_token');
        localStorage.removeItem('chess_user');
        if (redirect) window.location.href = '/login';
    },

    /**
     * Require login — redirect to /login if not authenticated.
     * Call this at the top of any protected page.
     */
    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login';
        }
    },

    /**
     * Authenticated fetch — automatically adds Authorization header.
     * Handles 401 by logging out and redirecting.
     *
     * @param {string} url
     * @param {RequestInit} [options={}]
     * @returns {Promise<Response>}
     */
    async fetch(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            this.logout(true);
            throw new Error('Session expired. Please log in again.');
        }
        return response;
    },

    /**
     * Convenience: POST JSON with auth.
     * @param {string} url
     * @param {object} body
     * @returns {Promise<any>} parsed JSON
     */
    async post(url, body) {
        const res = await this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return res.json();
    },

    /**
     * Convenience: GET with auth.
     * @param {string} url
     * @returns {Promise<any>} parsed JSON
     */
    async get(url) {
        const res = await this.fetch(url);
        return res.json();
    },
};

// Make globally available
window.Auth = Auth;
