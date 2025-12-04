document.addEventListener('DOMContentLoaded', function() {
  // ========== 侧边栏控制 ==========
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const closeSidebar = document.getElementById('closeSidebar');
  
  function openSidebar() {
    sidebar?.classList.add('open');
    mobileOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  
  function closeSidebarMenu() {
    sidebar?.classList.remove('open');
    mobileOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  }
  
  sidebarToggle?.addEventListener('click', openSidebar);
  closeSidebar?.addEventListener('click', closeSidebarMenu);
  mobileOverlay?.addEventListener('click', closeSidebarMenu);
  
  // ========== 复制链接功能 ==========
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const url = this.getAttribute('data-url');
      if (!url) return;
      
      navigator.clipboard.writeText(url).then(() => {
        showCopySuccess(this);
      }).catch(() => {
        // 备用方法
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          showCopySuccess(this);
        } catch (e) {
          alert('复制失败,请手动复制');
        }
        document.body.removeChild(textarea);
      });
    });
  });
  
  function showCopySuccess(btn) {
    const successMsg = btn.querySelector('.copy-success');
    successMsg.classList.remove('hidden');
    successMsg.classList.add('copy-success-animation');
    setTimeout(() => {
      successMsg.classList.add('hidden');
      successMsg.classList.remove('copy-success-animation');
    }, 2000);
  }
  
  // ========== 返回顶部 ==========
  const backToTop = document.getElementById('backToTop');
  
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      backToTop?.classList.remove('opacity-0', 'invisible');
    } else {
      backToTop?.classList.add('opacity-0', 'invisible');
    }
  });
  
  backToTop?.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  // ========== 模态框控制 ==========
  const addSiteModal = document.getElementById('addSiteModal');
  const addSiteBtnSidebar = document.getElementById('addSiteBtnSidebar');
  const closeModalBtn = document.getElementById('closeModal');
  const cancelAddSite = document.getElementById('cancelAddSite');
  const addSiteForm = document.getElementById('addSiteForm');
  
  function openModal() {
    addSiteModal?.classList.remove('opacity-0', 'invisible');
    addSiteModal?.querySelector('.max-w-md')?.classList.remove('translate-y-8');
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
    addSiteModal?.classList.add('opacity-0', 'invisible');
    addSiteModal?.querySelector('.max-w-md')?.classList.add('translate-y-8');
    document.body.style.overflow = '';
  }
  
  async function fetchCategoriesForSelect() {
    const selectElement = document.getElementById('addSiteCatelog');
    if (!selectElement) return;

    try {
      const response = await fetch('/api/categories?pageSize=999');
      const data = await response.json();
      if (data.code === 200 && data.data) {
        selectElement.innerHTML = '<option value="" disabled selected>请选择一个分类</option>';
        data.data.forEach(category => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.catelog;
          selectElement.appendChild(option);
        });
      } else {
        selectElement.innerHTML = '<option value="" disabled>无法加载分类</option>';
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      selectElement.innerHTML = '<option value="" disabled>加载分类失败</option>';
    }
  }

  addSiteBtnSidebar?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
    fetchCategoriesForSelect();
  });
  
  closeModalBtn?.addEventListener('click', closeModal);
  cancelAddSite?.addEventListener('click', closeModal);
  addSiteModal?.addEventListener('click', (e) => {
    if (e.target === addSiteModal) closeModal();
  });
  
  // ========== 表单提交 ==========
  addSiteForm?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = {
      name: document.getElementById('addSiteName').value,
      url: document.getElementById('addSiteUrl').value,
      logo: document.getElementById('addSiteLogo').value,
      desc: document.getElementById('addSiteDesc').value,
      catelog_id: document.getElementById('addSiteCatelog').value
    };
    
    fetch('/api/config/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
      if (data.code === 201) {
        showToast('提交成功,等待管理员审核');
        closeModal();
        addSiteForm.reset();
      } else {
        alert(data.message || '提交失败');
      }
    })
    .catch(err => {
      console.error('网络错误:', err);
      alert('网络错误,请稍后重试');
    });
  });
  
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-accent-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
  
  // ========== 搜索功能 ==========
  const searchInput = document.getElementById('searchInput');
  const sitesGrid = document.getElementById('sitesGrid');
  
  searchInput?.addEventListener('input', function() {
    const keyword = this.value.toLowerCase().trim();
    const cards = sitesGrid?.querySelectorAll('.site-card');
    
    cards?.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const url = (card.dataset.url || '').toLowerCase();
      const catalog = (card.dataset.catalog || '').toLowerCase();
      
      if (name.includes(keyword) || url.includes(keyword) || catalog.includes(keyword)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
    
    updateHeading(keyword);
  });
  
  function updateHeading(keyword) {
    const heading = document.querySelector('[data-role="list-heading"]');
    if (!heading) return;
    
    const visibleCount = sitesGrid?.querySelectorAll('.site-card:not(.hidden)').length || 0;
    const defaultText = heading.dataset.default || '';
    const activeText = heading.dataset.active || '';
    
    if (keyword) {
      heading.textContent = `搜索结果 · ${visibleCount} 个网站`;
    } else if (activeText) {
      heading.textContent = `${activeText} · ${visibleCount} 个网站`;
    } else {
      heading.textContent = defaultText;
    }
  }
  
  // ========== 一言 API ==========
  fetch('https://v1.hitokoto.cn')
    .then(res => res.json())
    .then(data => {
      const hitokoto = document.getElementById('hitokoto_text');
      if (hitokoto) {
        hitokoto.href = `https://hitokoto.cn/?uuid=${data.uuid}`;
        hitokoto.innerText = data.hitokoto;
      }
    })
    .catch(console.error);
});
