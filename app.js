let tg = window.Telegram.WebApp;
tg.expand();

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#31B545';

// Настройки
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
let totalItems = 0;
let allItems = [];
let filteredItems = [];
let cart = [];

let filters = {
    type: 'all',
    search: '',
    sort: 'none',
    tags: []
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

    // Добавляем отображение количества фото
    const imageCountHTML = p.image_count ? 
        `<span class="image-count">📸 ${p.image_count}</span>` : '';

    return `
        <div class="item">
            ${mediaHTML}
            <div class="item-info">
                <p class="caption">${p.caption}</p>
                <div class="item-details">
                    <span class="price">${p.price} ⭐️</span>
                    ${imageCountHTML}
                </div>
            </div>
            <button class="btn" 
                data-id="${p.id}" 
                data-label="${p.label}" 
                data-price="${p.price}" 
                data-tags="${p.tags.join(',')}">Buy</button>
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

        // Теги (множественный выбор)
        if (filters.tags.length > 0) {
            const tags = btn.getAttribute("data-tags").split(',');
            const hasAllTags = filters.tags.every(tag => tags.includes(tag));
            if (!hasAllTags) return false;
        }

        return true;
    });

    applySorting();
    
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

    if (prevBtn) {
        prevBtn.innerHTML = "<b>&#10094;</b>";
        prevBtn.disabled = (currentPage === 1);
    }
    if (nextBtn) {
        nextBtn.innerHTML = "<b>&#10095;</b>";
        nextBtn.disabled = (currentPage === totalPages || totalPages === 0);
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || i === currentPage) {
            addPageButton(i, pageNumbers);
        } 
        else if (i === currentPage - 1 || i === currentPage + 1) {
            addPageButton(i, pageNumbers);
        }
        else if (i === currentPage - 2 || i === currentPage + 2) {
            const span = document.createElement("span");
            span.className = "page-dots";
            span.textContent = "..";
            pageNumbers.appendChild(span);
        }
    }
}

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
        const imageInfo = item.image_count ? ` (${item.image_count} фото)` : '';
        li.innerHTML = `${item.label}${imageInfo} - ${item.price} ⭐️ 
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
    
    allItems = products.map(p => {
        const div = document.createElement('div');
        div.innerHTML = createProductHTML(p);
        const element = div.firstElementChild;
        
        element.querySelector('.btn').addEventListener('click', () => addToCart(p));
        return element;
    });

    const allTags = getAllTags(products);
    renderTags(allTags);

    initFilters();
    adjustLayout();
    applyAllFilters();
}

function getAllTags(products) {
    const tagSet = new Set();
    products.forEach(p => {
        if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
}

function renderTags(tags) {
    const tagsList = document.getElementById('tagsList');
    if (!tagsList) return;
    
    // Эмодзи для популярных тегов (можно расширить)
    const tagEmojis = {
        'ai': '🤖',
        'asian': '🍣',
        'big_b': '🍒',
        'big_lips': '💋',
        'black': '🍫',
        'blonde': '💛',
        'blue_hair': '💎',
        'cosplay': '🎭',
        'cute': '🥰',
        'fat': '🍩',
        'fit': '💪',
        'goth': '🦇',
        'latina': '🔥',
        'lingerie': '🩲',
        'milf': '🍷',
        'natural': '🌿',
        'red_hair': '🍁',
        'slim': '🧘',
        'tattoo': '✒️',
        'teen': '🌸',
        'alt_girl': '🖤',
        'black': '🍫'
    };
    
    tagsList.innerHTML = '';
    tags.forEach(tag => {
        const button = document.createElement('button');
        button.className = 'tag-option';
        button.dataset.tag = tag;
        
        const emoji = tagEmojis[tag] || '🏷️';
        
        button.innerHTML = `
            <span class="tag-text">
                <span class="tag-icon">${emoji}</span>
                ${tag.replace(/_/g, ' ')}
            </span>
            <span class="checkmark">✓</span>
        `;
        tagsList.appendChild(button);
    });
}

function initFilters() {
    const searchInput = document.getElementById("searchInput");
    searchInput?.addEventListener("input", (e) => {
        filters.search = e.target.value.toLowerCase();
        applyAllFilters();
    });

    setupDropdown('typeToggleBtn', 'typeDropdown', 'type');
    setupDropdown('sortToggleBtn', 'sortDropdown', 'sort');
    setupTagsFilter();

    document.getElementById("prevPage")?.addEventListener("click", () => {
        if (currentPage > 1) showPage(currentPage - 1);
    });
    document.getElementById("nextPage")?.addEventListener("click", () => {
        if (currentPage < Math.ceil(totalItems / ITEMS_PER_PAGE)) showPage(currentPage + 1);
    });

    document.getElementById("closeCartModal")?.addEventListener("click", () => {
        document.getElementById("cartModal").classList.remove("show");
    });
    document.getElementById("cartIcon")?.addEventListener("click", () => {
        document.getElementById("cartModal").classList.toggle("show");
    });

    document.getElementById("checkoutBtn")?.addEventListener("click", () => {
        if (cart.length === 0) return;
        tg.sendData(JSON.stringify({
            items: cart,
            total: cart.reduce((sum, i) => sum + i.price, 0),
            user: tg.initDataUnsafe?.user
        }));
        tg.close();
    });

    document.getElementById("clearTagsBtn")?.addEventListener("click", () => {
        filters.tags = [];
        updateTagSelectionUI();
        applyAllFilters();
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

function setupTagsFilter() {
    const btn = document.getElementById("tagsToggleBtn");
    const menu = document.getElementById("tagsDropdown");
    const searchInput = document.getElementById("tagsSearchInput");
    
    if (!btn || !menu) return;

    btn.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
        if (menu.classList.contains('show') && searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    };

    // Поиск по тегам
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const tagOptions = menu.querySelectorAll('.tag-option');
            
            tagOptions.forEach(opt => {
                const tagText = opt.querySelector('.tag-text')?.textContent?.toLowerCase() || '';
                if (query === '' || tagText.includes(query)) {
                    opt.classList.remove('hidden-tag');
                } else {
                    opt.classList.add('hidden-tag');
                }
            });
        });

        // Очистка поиска при закрытии
        menu.addEventListener('transitionend', () => {
            if (!menu.classList.contains('show') && searchInput) {
                searchInput.value = '';
                const tagOptions = menu.querySelectorAll('.tag-option');
                tagOptions.forEach(opt => opt.classList.remove('hidden-tag'));
            }
        });
    }

    // Обработка кликов по тегам
    menu.querySelectorAll('.tag-option').forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            const tag = opt.dataset.tag;
            const index = filters.tags.indexOf(tag);
            
            if (index === -1) {
                filters.tags.push(tag);
                opt.classList.add('selected');
            } else {
                filters.tags.splice(index, 1);
                opt.classList.remove('selected');
            }
            
            updateTagSelectionUI();
            applyAllFilters();
            
            // Вибрация для телефона
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        };
    });

    // Закрытие по клику вне
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
            menu.classList.remove('show');
        }
    });
}

function updateTagSelectionUI() {
    const btn = document.getElementById("tagsToggleBtn");
    const menu = document.getElementById("tagsDropdown");
    if (!btn || !menu) return;

    // Обновляем кнопку
    if (filters.tags.length === 0) {
        btn.innerHTML = '🏷️ Tags ▼';
        btn.classList.remove('has-tags');
    } else {
        btn.innerHTML = `🏷️ Tags <span class="tag-badge">${filters.tags.length}</span> ▼`;
        btn.classList.add('has-tags');
    }

    // Обновляем состояние опций
    menu.querySelectorAll('.tag-option').forEach(opt => {
        const tag = opt.dataset.tag;
        if (filters.tags.includes(tag)) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

function adjustLayout() {
    const topBar = document.querySelector('.top-bar');
    const container = document.querySelector('.container');
    if (topBar && container) {
        container.style.paddingTop = (topBar.offsetHeight + 10) + 'px';
    }
}

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