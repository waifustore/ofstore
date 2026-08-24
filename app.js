let tg = window.Telegram.WebApp;
tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#31B545';

// Настройки
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
let totalItems = 0;
let allItems = [];      // Оригинальные DOM-элементы всех товаров
let filteredItems = []; // Отфильтрованные элементы
let cart = [];

let filters = {
    type: 'all',
    anime: 'all',
    search: '',
    sort: 'none'
};

// --- 1. ЗАГРУЗКА ДАННЫХ ---

async function loadProducts() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error('Сетевая ошибка');
        return await response.json();
    } catch (error) {
        console.error("Ошибка загрузки JSON:", error);
        return [];
    }
}

// --- 2. ГЕНЕРАЦИЯ HTML ---

function createProductHTML(p) {
    const isVideo = p.img_src.toLowerCase().endsWith('.mp4');
    const mediaHTML = isVideo 
        ? `<video src="${p.img_src}" class="img" autoplay loop muted playsinline preload="auto"></video>`
        : `<img src="${p.img_src}" alt="" class="img" loading="lazy">`;

    return `
        <div class="item">
            ${mediaHTML}
            <p class="caption">${p.caption}</p>
            <span class="price">${p.price} ⭐️</span>
            <button class="btn" 
                data-id="${p.id}" 
                data-label="${p.label}" 
                data-price="${p.price}" 
                data-tags="${p.tags.join(',')}" 
                data-anime="${p.anime}">Buy</button>
        </div>
    `;
}

// --- 3. ЛОГИКА ФИЛЬТРАЦИИ И СОРТИРОВКИ ---

function applyAllFilters() {
    filteredItems = allItems.filter(itemElement => {
        const btn = itemElement.querySelector(".btn");
        if (!btn) return false;

        // Поиск
        if (filters.search) {
            const caption = itemElement.querySelector(".caption").textContent.toLowerCase();
            if (!caption.includes(filters.search)) return false;
        }

        // Категория (Type)
        if (filters.type !== 'all') {
            const tags = btn.getAttribute("data-tags").split(',');
            if (!tags.includes(filters.type)) return false;
        }

        // Аниме
        if (filters.anime !== 'all') {
            if (btn.getAttribute("data-anime") !== filters.anime) return false;
        }

        return true;
    });

    applySorting(); // Сортируем то, что осталось
    
    totalItems = filteredItems.length;
    currentPage = 1;
    showPage(1);
}

function applySorting() {
    if (filters.sort === 'none') return;

    filteredItems.sort((a, b) => {
        const aBtn = a.querySelector(".btn");
        const bBtn = b.querySelector(".btn");
        
        const aPrice = parseFloat(aBtn.dataset.price);
        const bPrice = parseFloat(bBtn.dataset.price);
        const aLabel = aBtn.dataset.label;
        const bLabel = bBtn.dataset.label;

        switch (filters.sort) {
            case 'price-asc': return aPrice - bPrice;
            case 'price-desc': return bPrice - aPrice;
            case 'alphabetical': return aLabel.localeCompare(bLabel);
            default: return 0;
        }
    });
}

// --- 4. ПАГИНАЦИЯ ---

function showPage(page) {
    const container = document.getElementById("productsContainer");
    if (!container) return;

    container.innerHTML = '';
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToShow = filteredItems.slice(start, end);

    itemsToShow.forEach(item => {
        container.appendChild(item);
        // Если внутри видео, пробуем запустить (браузеры иногда блокируют)
        const video = item.querySelector('video');
        if (video) video.play().catch(() => {});
    });

    currentPage = page;
    updatePaginationControls();
    window.scrollTo(0, 0);
}

function updatePaginationControls() {
    const pageNumbers = document.getElementById("pageNumbers");
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    
    if (!pageNumbers) return;

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    pageNumbers.innerHTML = "";

    // Настраиваем стрелки
    if (prevBtn) {
        prevBtn.innerHTML = "<b>&#10094;</b>"; // Толстая стрелка
        prevBtn.disabled = (currentPage === 1);
    }
    if (nextBtn) {
        nextBtn.innerHTML = "<b>&#10095;</b>"; // Толстая стрелка
        nextBtn.disabled = (currentPage === totalPages || totalPages === 0);
    }

    // Логика формирования: 1 ... текущая ... последняя
    for (let i = 1; i <= totalPages; i++) {
        // Всегда показываем первую, последнюю и текущую
        if (i === 1 || i === totalPages || i === currentPage) {
            addPageButton(i, pageNumbers);
        } 
        // Если страница стоит сразу перед или после текущей - тоже показываем (чтобы не было 1 ... 2 ... 3)
        else if (i === currentPage - 1 || i === currentPage + 1) {
            addPageButton(i, pageNumbers);
        }
        // Ставим многоточие
        else if (i === currentPage - 2 || i === currentPage + 2) {
            const span = document.createElement("span");
            span.className = "page-dots";
            span.textContent = "..";
            pageNumbers.appendChild(span);
        }
    }
}

// Вспомогательная функция для создания кнопки
function addPageButton(i, container) {
    const btn = document.createElement("button");
    btn.className = `page-number-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => showPage(i);
    container.appendChild(btn);
}

// --- 5. КОРЗИНА ---

function addToCart(product) {
    cart.push(product);
    updateCartDisplay();
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    
    const cartIcon = document.getElementById("cartIcon");
    cartIcon.classList.add("shake");
    setTimeout(() => cartIcon.classList.remove("shake"), 600);
}

function updateCartDisplay() {
    const cartCount = document.getElementById("cartCount");
    const cartItems = document.getElementById("cartItems");
    const totalPriceEl = document.getElementById("totalPrice");
    const checkoutBtn = document.getElementById("checkoutBtn");

    cartCount.textContent = cart.length;
    cartItems.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `${item.label} - ${item.price} ⭐️ 
            <span class="remove-item" onclick="removeFromCart(${index})">❌</span>`;
        cartItems.appendChild(li);
        total += item.price;
    });

    totalPriceEl.textContent = total;
    checkoutBtn.style.display = total > 0 ? "block" : "none";
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    updateCartDisplay();
};

// --- 6. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ ---

async function init() {
    const products = await loadProducts();
    
    // Создаем элементы один раз и храним их в allItems
    allItems = products.map(p => {
        const div = document.createElement('div');
        div.innerHTML = createProductHTML(p);
        const element = div.firstElementChild;
        
        element.querySelector('.btn').addEventListener('click', () => addToCart(p));
        return element;
    });

    // Инициализация UI
    initFilters();
    adjustLayout();
    applyAllFilters(); // Первая отрисовка
}

function initFilters() {
    // Поиск
    const searchInput = document.getElementById("searchInput");
    searchInput?.addEventListener("input", (e) => {
        filters.search = e.target.value.toLowerCase();
        applyAllFilters();
    });

    // Универсальный обработчик для всех дропдаунов (Тип, Аниме, Сортировка)
    setupDropdown('typeToggleBtn', 'typeDropdown', 'type');
    setupDropdown('animeToggleBtn', 'animeDropdown', 'anime');
    setupDropdown('sortToggleBtn', 'sortDropdown', 'sort');

    // Кнопки пагинации
    document.getElementById("prevPage")?.addEventListener("click", () => {
        if (currentPage > 1) showPage(currentPage - 1);
    });
    document.getElementById("nextPage")?.addEventListener("click", () => {
        if (currentPage < Math.ceil(totalItems / ITEMS_PER_PAGE)) showPage(currentPage + 1);
    });

    // Закрытие модалки корзины
    document.getElementById("closeCartModal")?.addEventListener("click", () => {
        document.getElementById("cartModal").classList.remove("show");
    });
    document.getElementById("cartIcon")?.addEventListener("click", () => {
        document.getElementById("cartModal").classList.toggle("show");
    });

    // Кнопка купить (Checkout)
    document.getElementById("checkoutBtn")?.addEventListener("click", () => {
        if (cart.length === 0) return;
        tg.sendData(JSON.stringify({
            items: cart,
            total: cart.reduce((sum, i) => sum + i.price, 0),
            user: tg.initDataUnsafe?.user
        }));
        tg.close();
    });
}

function setupDropdown(btnId, menuId, filterKey) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!btn || !menu) return;

    btn.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
    };

    menu.querySelectorAll('.filter-option').forEach(opt => {
        opt.onclick = (e) => {
            filters[filterKey] = e.target.dataset[filterKey] || e.target.dataset.sort;
            btn.textContent = e.target.textContent + " ▼";
            menu.classList.remove('show');
            applyAllFilters();
        };
    });
}

function adjustLayout() {
    const topBar = document.querySelector('.top-bar');
    const container = document.querySelector('.container');
    if (topBar && container) {
        container.style.paddingTop = (topBar.offsetHeight + 10) + 'px';
    }
}

// Скрытие фильтров при скролле
window.addEventListener('scroll', () => {
    const wrapper = document.querySelector('.filters-wrapper');
    if (window.scrollY > 20) {
        wrapper.classList.add('hidden-on-scroll');
    } else {
        wrapper.classList.remove('hidden-on-scroll');
    }
});

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', adjustLayout);