function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) {
        navLinks.classList.toggle('active');
        // 点击菜单外区域自动关闭
        if (navLinks.classList.contains('active')) {
            document.addEventListener('click', closeMenuOnClickOutside);
        } else {
            document.removeEventListener('click', closeMenuOnClickOutside);
        }
    }
}

function closeMenuOnClickOutside(event) {
    const navLinks = document.getElementById('navLinks');
    const mobileMenuBtn = document.querySelector('.mobile-menu');

    if (!navLinks.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        navLinks.classList.remove('active');
        document.removeEventListener('click', closeMenuOnClickOutside);
    }
}

// 窗口大小变化时自动关闭菜单（避免状态不一致）
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.getElementById('navLinks').classList.remove('active');
    }
});