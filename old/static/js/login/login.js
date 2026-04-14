/**
 * 登录页面 JavaScript 模块
 *
 * 处理登录页面的交互逻辑
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const policeNumberInput = document.getElementById('police-number');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const loginButton = document.getElementById('login-button');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoading = loginButton.querySelector('.button-loading');

    // 密码显示/隐藏切换
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // 切换图标
        const icon = togglePasswordBtn.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });

    // 表单提交
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const policeNumber = policeNumberInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = document.getElementById('remember-me').checked;

        // 表单验证
        if (!policeNumber) {
            showError('请输入警号');
            policeNumberInput.focus();
            // 触发蹦跳动画
            if (typeof aiLogo !== 'undefined') {
                aiLogo.jump();
            }
            return;
        }

        if (!password) {
            showError('请输入密码');
            passwordInput.focus();
            // 触发蹦跳动画
            if (typeof aiLogo !== 'undefined') {
                aiLogo.jump();
            }
            return;
        }

        // 清除之前的错误信息
        clearError();

        // 显示加载状态
        setLoading(true);

        try {
            // 调用登录 API
            const response = await fetch('/api/auth/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'login',
                    args: {
                        police_number: policeNumber,
                        password: password,
                        remember_me: rememberMe
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                // 登录成功，触发机器人眨眼动画
                if (typeof aiLogo !== 'undefined') {
                    aiLogo.blink(3);
                }

                // 延迟后淡出登录界面
                setTimeout(() => {
                    document.body.classList.add('fade-out');

                    // 淡出完成后跳转
                    setTimeout(() => {
                        window.location.href = '/workplace/';
                    }, 500);
                }, 800);
            } else {
                // 登录失败
                showError(data.error || '用户名或密码错误');
                setLoading(false);
                // 触发蹦跳动画
                if (typeof aiLogo !== 'undefined') {
                    aiLogo.jump();
                }
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            showError('网络连接失败，请稍后重试');
            setLoading(false);
            // 触发蹦跳动画
            if (typeof aiLogo !== 'undefined') {
                aiLogo.jump();
            }
        }
    });

    /**
     * 设置加载状态
     * @param {boolean} loading - 是否正在加载
     */
    function setLoading(loading) {
        loginButton.disabled = loading;
        buttonText.style.display = loading ? 'none' : 'inline-block';
        buttonLoading.style.display = loading ? 'inline-block' : 'none';
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     */
    function showError(message) {
        clearError();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${escapeHtml(message)}</span>
        `;

        loginForm.insertBefore(errorDiv, loginForm.firstChild);
    }

    /**
     * 清除错误信息
     */
    function clearError() {
        const existingError = loginForm.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * HTML 转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 输入框焦点效果
    [policeNumberInput, passwordInput].forEach(input => {
        input.addEventListener('focus', function() {
            clearError();
        });
    });

    // 检查本地存储的记住我
    const savedPoliceNumber = localStorage.getItem('remembered_police_number');
    if (savedPoliceNumber) {
        policeNumberInput.value = savedPoliceNumber;
        document.getElementById('remember-me').checked = true;
    }
});
