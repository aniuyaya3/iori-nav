// Cache Management Logic
// Separated from admin.js

window.markCacheStale = function() {
    const btn = document.getElementById('refreshCacheBtn');
    if(btn) {
        btn.classList.add('has-updates');
        if(!btn.querySelector('.update-dot')) {
             const dot = document.createElement('span');
             dot.className = 'update-dot absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white';
             btn.style.position = 'relative';
             btn.appendChild(dot);
        }
    }
    localStorage.setItem('nav_cache_stale', 'true');
}

window.resetCacheStale = function() {
    const btn = document.getElementById('refreshCacheBtn');
    if(btn) {
        btn.classList.remove('has-updates');
        const dot = btn.querySelector('.update-dot');
        if(dot) dot.remove();
    }
    localStorage.removeItem('nav_cache_stale');
}

document.addEventListener('DOMContentLoaded', () => {
    // Check stale state on load
    if(localStorage.getItem('nav_cache_stale') === 'true') {
       window.markCacheStale();
    }

    // Refresh Cache Button Logic
    const refreshCacheBtn = document.getElementById('refreshCacheBtn');
    const refreshCacheModal = document.getElementById('refreshCacheModal');
    const closeRefreshCacheModal = document.getElementById('closeRefreshCacheModal');
    const cancelRefreshCacheBtn = document.getElementById('cancelRefreshCacheBtn');
    const confirmRefreshCacheBtn = document.getElementById('confirmRefreshCacheBtn');

    if (refreshCacheBtn && refreshCacheModal) {
        // Open Modal
        refreshCacheBtn.addEventListener('click', () => {
            refreshCacheModal.style.display = 'block';
            document.body.classList.add('modal-open');
        });

        // Close Modal Helper
        const closeRefreshModal = () => {
            refreshCacheModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        };

        // Close Events
        if (closeRefreshCacheModal) closeRefreshCacheModal.onclick = closeRefreshModal;
        if (cancelRefreshCacheBtn) cancelRefreshCacheBtn.onclick = closeRefreshModal;
        refreshCacheModal.onclick = (e) => {
            if (e.target === refreshCacheModal) closeRefreshModal();
        };

        // Confirm Action
        if (confirmRefreshCacheBtn) {
            confirmRefreshCacheBtn.onclick = () => {
                confirmRefreshCacheBtn.disabled = true;
                const originalText = confirmRefreshCacheBtn.innerHTML;
                confirmRefreshCacheBtn.innerHTML = '<svg class="animate-spin h-4 w-4 text-white inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 刷新中...';
                
                fetch('/api/cache/clear', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.code === 200) {
                            window.showMessage('缓存刷新成功', 'success');
                            window.resetCacheStale(); // Explicitly call reset
                            closeRefreshModal();
                        } else {
                            window.showMessage('缓存刷新失败: ' + data.message, 'error');
                        }
                    })
                    .catch(err => {
                        window.showMessage('网络错误', 'error');
                    })
                    .finally(() => {
                        confirmRefreshCacheBtn.disabled = false;
                        confirmRefreshCacheBtn.innerHTML = originalText;
                    });
            };
        }
    }
});
