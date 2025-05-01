document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("pre").forEach((block) => {
        // 创建按钮
        const button = document.createElement("button");
        button.className = "copy-button";
        button.innerHTML = '<i class="fas fa-copy"></i>'; // 初始为复制图标

        // 点击复制逻辑
        button.addEventListener("click", () => {
            const code = block.innerText;
            navigator.clipboard.writeText(code).then(() => {
                // 成功后变图标为 check，并加样式
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.classList.add("copied");

                // 两秒后恢复
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-copy"></i>';
                    button.classList.remove("copied");
                }, 2000);
            });
        });

        // 插入按钮
        block.appendChild(button);
    });
});
