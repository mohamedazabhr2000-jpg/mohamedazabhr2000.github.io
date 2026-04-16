/* ==============================================
   OUIIL HOME - Main JavaScript
   ============================================== */

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycby0yZqkjqjvxnogs-ty7xbnauShLmH7ZhMVam2i3FxD7BSp1HCgg7F62ZUUFqLKrKtZ/exec',
    WHATSAPP: '201050986433',
    EMAIL: 'ouiilco@gmail.com',
    PAYMENT_NUMBER: '01285910373',
    DEFAULT_SHIPPING: 120,
    CURRENCY: 'ج.م'
};

// ==========================================
// 2. GLOBAL STATE
// ==========================================
const STATE = {
    product: {
        id: 1,
        name: 'لوح تقطيع ستانلس ستيل للمطبخ 30×40 سم',
        price: 620,
        oldPrice: null,
        images: ['images/product-1.png', 'images/product-2.png', 'images/product-3.png'],
        stock: true
    },
    cart: {
        quantity: 1,
        shipping: CONFIG.DEFAULT_SHIPPING,
        discount: 0,
        couponCode: '',
        couponApplied: false
    },
    settings: {},
    shippingRates: {},
    isLoading: false
};

// ==========================================
// 3. DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initMobileMenu();
    initScrollTop();
    initFaq();
    loadProductData();
    loadSettings();
});

// ==========================================
// 4. HEADER SCROLL EFFECT
// ==========================================
function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ==========================================
// 5. MOBILE MENU
// ==========================================
function initMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('mobileOverlay');

    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', function () {
        toggle.classList.toggle('active');
        mobileNav.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
        document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });

    if (overlay) {
        overlay.addEventListener('click', function () {
            closeMobileMenu();
        });
    }

    // Close menu when clicking a link
    const mobileLinks = mobileNav.querySelectorAll('a');
    mobileLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            closeMobileMenu();
        });
    });
}

function closeMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('mobileOverlay');

    if (toggle) toggle.classList.remove('active');
    if (mobileNav) mobileNav.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
}

// ==========================================
// 6. SCROLL TO TOP
// ==========================================
function initScrollTop() {
    const scrollBtn = document.getElementById('scrollTop');
    if (!scrollBtn) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 400) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 7. FAQ ACCORDION
// ==========================================
function initFaq() {
    // Auto-handled via onclick in HTML
}

function toggleFaq(element) {
    const faqItem = element.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');
    const answer = faqItem.querySelector('.faq-answer');

    // Close all
    document.querySelectorAll('.faq-item').forEach(function (item) {
        item.classList.remove('active');
        const ans = item.querySelector('.faq-answer');
        if (ans) ans.style.maxHeight = null;
    });

    // Open clicked if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
        if (answer) {
            answer.style.maxHeight = answer.scrollHeight + 'px';
        }
    }
}

// ==========================================
// 8. IMAGE GALLERY
// ==========================================
function changeImage(src, thumbEl) {
    const mainImg = document.getElementById('mainProductImage');
    if (mainImg) {
        mainImg.style.opacity = '0';
        setTimeout(function () {
            mainImg.src = src;
            mainImg.style.opacity = '1';
        }, 200);
    }

    // Update active thumb
    document.querySelectorAll('.thumb-item').forEach(function (t) {
        t.classList.remove('active');
    });
    if (thumbEl) thumbEl.classList.add('active');
}

// ==========================================
// 9. API CALLS - FINAL FIX
// ==========================================
function apiCall(action, data) {
    return new Promise(function (resolve, reject) {
        var url = CONFIG.API_URL + '?action=' + encodeURIComponent(action);

        if (data) {
            Object.keys(data).forEach(function (key) {
                url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
            });
        }

        fetch(url, {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
        })
        .then(function (response) {
            return response.text();
        })
        .then(function (text) {
            try {
                var result = JSON.parse(text);
                resolve(result);
            } catch (e) {
                // لو الرد مش JSON - يبقى فيه مشكلة
                console.log('Response text:', text);
                resolve({ success: false, message: 'Invalid response' });
            }
        })
        .catch(function (error) {
            console.error('API GET Error:', error);
            reject(error);
        });
    });
}

function apiPost(action, data) {
    return new Promise(function (resolve, reject) {
        var url = CONFIG.API_URL;

        var formBody = 'action=' + encodeURIComponent(action);

        if (data) {
            Object.keys(data).forEach(function (key) {
                formBody += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(data[key] || '');
            });
        }

        fetch(url, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formBody
        })
        .then(function (response) {
            return response.text();
        })
        .then(function (text) {
            try {
                var result = JSON.parse(text);
                resolve(result);
            } catch (e) {
                console.log('POST Response:', text);
                // لو الرد مش JSON بس الطلب اتبعت - اعتبره ناجح
                if (text.indexOf('success') > -1 || text.indexOf('تم') > -1) {
                    resolve({ success: true, message: 'تم بنجاح' });
                } else {
                    resolve({ success: false, message: 'خطأ في الاستجابة' });
                }
            }
        })
        .catch(function (error) {
            console.error('API POST Error:', error);
            reject(error);
        });
    });
}
// ==========================================
// 10. LOAD DATA FROM SHEETS
// ==========================================
function loadProductData() {
    apiCall('getProduct')
        .then(function (data) {
            if (data && data.success) {
                updateProductUI(data.product);
            }
        })
        .catch(function () {
            console.log('Using default product data');
        });
}

function loadSettings() {
    apiCall('getSettings')
        .then(function (data) {
            if (data && data.success) {
                STATE.settings = data.settings;
            }
        })
        .catch(function () {
            console.log('Using default settings');
        });
}

function loadShippingRates() {
    return apiCall('getShipping')
        .then(function (data) {
            if (data && data.success) {
                STATE.shippingRates = data.shipping;
                return data.shipping;
            }
            return {};
        })
        .catch(function () {
            console.log('Using default shipping');
            return {};
        });
}

function validateCoupon(code) {
    return apiCall('validateCoupon', { code: code })
        .then(function (data) {
            return data;
        })
        .catch(function () {
            return { success: false, message: 'حدث خطأ أثناء التحقق' };
        });
}

function submitOrder(orderData) {
    return apiPost('submitOrder', orderData)
        .then(function (data) {
            return data;
        })
        .catch(function () {
            return { success: false, message: 'حدث خطأ أثناء إرسال الطلب' };
        });
}

function submitContact(contactData) {
    return apiPost('submitContact', contactData)
        .then(function (data) {
            return data;
        })
        .catch(function () {
            return { success: false, message: 'حدث خطأ أثناء الإرسال' };
        });
}

// ==========================================
// 11. UPDATE UI FROM API DATA
// ==========================================
function updateProductUI(product) {
    if (!product) return;

    STATE.product = { ...STATE.product, ...product };

    const priceEl = document.getElementById('productPrice');
    const oldPriceEl = document.getElementById('oldPrice');
    const badgeEl = document.getElementById('priceBadge');

    if (priceEl && product.price) {
        priceEl.textContent = product.price + ' ' + CONFIG.CURRENCY;
    }

    if (oldPriceEl && product.old_price && product.old_price > product.price) {
        oldPriceEl.textContent = product.old_price + ' ' + CONFIG.CURRENCY;
        oldPriceEl.style.display = 'inline';

        if (badgeEl) {
            const discount = Math.round(((product.old_price - product.price) / product.old_price) * 100);
            badgeEl.textContent = 'خصم ' + discount + '%';
            badgeEl.style.display = 'inline';
        }
    }
}

// ==========================================
// 12. TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    if (!toast) return;

    var icon = '';
    switch (type) {
        case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
        case 'error': icon = '<i class="fas fa-times-circle"></i>'; break;
        case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
    }

    toast.className = 'toast ' + type;
    toast.innerHTML = icon + '<span>' + message + '</span>';
    toast.classList.add('show');

    setTimeout(function () {
        toast.classList.remove('show');
    }, 4000);
}

// ==========================================
// 13. LOADING OVERLAY
// ==========================================
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('show');
    STATE.isLoading = true;
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
    STATE.isLoading = false;
}

// ==========================================
// 14. SUCCESS MODAL
// ==========================================
function showSuccess() {
    const overlay = document.getElementById('successOverlay');
    if (overlay) overlay.classList.add('show');
}

function hideSuccess() {
    const overlay = document.getElementById('successOverlay');
    if (overlay) overlay.classList.remove('show');
}

// ==========================================
// 15. UTILITY FUNCTIONS
// ==========================================
function formatPrice(amount) {
    return Number(amount).toLocaleString('ar-EG') + ' ' + CONFIG.CURRENCY;
}

function validatePhone(phone) {
    var cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
    return /^01[0125][0-9]{8}$/.test(cleaned);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function generateOrderId() {
    var now = new Date();
    var y = now.getFullYear().toString().slice(-2);
    var m = ('0' + (now.getMonth() + 1)).slice(-2);
    var d = ('0' + now.getDate()).slice(-2);
    var r = Math.floor(Math.random() * 9000) + 1000;
    return 'OUI-' + y + m + d + '-' + r;
}

// ==========================================
// 16. SMOOTH SCROLL FOR ANCHOR LINKS
// ==========================================
document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (link) {
        var targetId = link.getAttribute('href').slice(1);
        var target = document.getElementById(targetId);
        if (target) {
            e.preventDefault();
            var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
            var top = target.getBoundingClientRect().top + window.scrollY - headerH - 20;
            window.scrollTo({ top: top, behavior: 'smooth' });
        }
    }
});

// ==========================================
// 17. EGYPTIAN GOVERNORATES
// ==========================================
const GOVERNORATES = [
    'القاهرة',
    'الجيزة',
    'الإسكندرية',
    'الدقهلية',
    'البحر الأحمر',
    'البحيرة',
    'الفيوم',
    'الغربية',
    'الإسماعيلية',
    'المنوفية',
    'المنيا',
    'القليوبية',
    'الوادي الجديد',
    'السويس',
    'أسوان',
    'أسيوط',
    'بني سويف',
    'بورسعيد',
    'دمياط',
    'الشرقية',
    'جنوب سيناء',
    'كفر الشيخ',
    'مطروح',
    'الأقصر',
    'قنا',
    'شمال سيناء',
    'سوهاج'
];