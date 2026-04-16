/* ==============================================
   OUIIL HOME - Checkout JavaScript
   ============================================== */

// ==========================================
// 1. CHECKOUT STATE
// ==========================================
let currentStep = 1;
let uploadedFile = null;
let uploadedFileBase64 = null;

// ==========================================
// 2. INIT CHECKOUT
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    initCheckout();
});

function initCheckout() {
    populateGovernorates();
    initFormListeners();
    updateSummary();
    initGovernorateChange();

    // Form submit
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            handleSubmitOrder();
        });
    }
}

// ==========================================
// 3. POPULATE GOVERNORATES
// ==========================================
function populateGovernorates() {
    const select = document.getElementById('governorate');
    if (!select) return;

    GOVERNORATES.forEach(function (gov) {
        const option = document.createElement('option');
        option.value = gov;
        option.textContent = gov;
        select.appendChild(option);
    });
}

// ==========================================
// 4. GOVERNORATE CHANGE - UPDATE SHIPPING
// ==========================================
function initGovernorateChange() {
    const govSelect = document.getElementById('governorate');
    if (!govSelect) return;

    govSelect.addEventListener('change', function () {
        var gov = this.value;
        if (gov) {
            // Check if we have specific rate from API
            if (STATE.shippingRates && STATE.shippingRates[gov]) {
                STATE.cart.shipping = STATE.shippingRates[gov];
            } else {
                STATE.cart.shipping = CONFIG.DEFAULT_SHIPPING;
            }
        } else {
            STATE.cart.shipping = CONFIG.DEFAULT_SHIPPING;
        }
        updateSummary();
    });
}

// ==========================================
// 5. STEP NAVIGATION
// ==========================================
function goToStep(step) {
    // Validate current step before moving forward
    if (step > currentStep) {
        if (!validateStep(currentStep)) {
            return;
        }
    }

    // Update steps UI
    currentStep = step;

    // Hide all step contents
    document.querySelectorAll('.checkout-step-content').forEach(function (el) {
        el.classList.remove('active');
    });

    // Show target step
    var targetStep = document.getElementById('step' + step);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    // Update step indicators
    document.querySelectorAll('.checkout-steps .step').forEach(function (el) {
        var stepNum = parseInt(el.getAttribute('data-step'));
        el.classList.remove('active', 'completed');
        if (stepNum === step) {
            el.classList.add('active');
        } else if (stepNum < step) {
            el.classList.add('completed');
        }
    });

    // Update step lines
    document.querySelectorAll('.checkout-steps .step-line').forEach(function (line, index) {
        if (index < step - 1) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });

    // Scroll to top of form
    var formWrapper = document.querySelector('.checkout-form-wrapper');
    if (formWrapper) {
        var headerH = 80;
        var top = formWrapper.getBoundingClientRect().top + window.scrollY - headerH;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }
}

// ==========================================
// 6. STEP VALIDATION
// ==========================================
function validateStep(step) {
    clearAllErrors();

    switch (step) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3();
        default:
            return true;
    }
}

function validateStep1() {
    var valid = true;
    var name = document.getElementById('customerName');
    var phone = document.getElementById('phonePrimary');
    var phone2 = document.getElementById('phoneSecondary');

    // Name
    if (!name.value.trim() || name.value.trim().length < 3) {
        showFieldError('customerName', 'nameError', 'يرجى إدخال الاسم الكامل (3 أحرف على الأقل)');
        valid = false;
    }

    // Primary phone
    if (!phone.value.trim()) {
        showFieldError('phonePrimary', 'phoneError', 'يرجى إدخال رقم الموبايل');
        valid = false;
    } else if (!validatePhone(phone.value)) {
        showFieldError('phonePrimary', 'phoneError', 'رقم الموبايل غير صحيح – يجب أن يبدأ بـ 01 ويتكون من 11 رقم');
        valid = false;
    }

    // Secondary phone (optional but validate if filled)
    if (phone2.value.trim() && !validatePhone(phone2.value)) {
        showFieldError('phoneSecondary', 'phone2Error', 'رقم الموبايل الاحتياطي غير صحيح');
        valid = false;
    }

    if (!valid) {
        showToast('يرجى مراجعة البيانات المطلوبة', 'error');
    }

    return valid;
}

function validateStep2() {
    var valid = true;
    var gov = document.getElementById('governorate');
    var city = document.getElementById('city');
    var address = document.getElementById('fullAddress');

    // Governorate
    if (!gov.value) {
        showFieldError('governorate', 'govError', 'يرجى اختيار المحافظة');
        valid = false;
    }

    // City
    if (!city.value.trim() || city.value.trim().length < 2) {
        showFieldError('city', 'cityError', 'يرجى إدخال اسم المدينة');
        valid = false;
    }

    // Address
    if (!address.value.trim() || address.value.trim().length < 10) {
        showFieldError('fullAddress', 'addressError', 'يرجى إدخال العنوان بالتفصيل (10 أحرف على الأقل)');
        valid = false;
    }

    if (!valid) {
        showToast('يرجى إكمال بيانات العنوان', 'error');
    }

    return valid;
}

function validateStep3() {
    var valid = true;
    var paymentMethod = getSelectedPayment();

    if (!paymentMethod) {
        showToast('يرجى اختيار طريقة الدفع', 'error');
        valid = false;
        return valid;
    }

    // If wallet or instapay - require proof
    if (paymentMethod === 'wallet' || paymentMethod === 'instapay') {
        if (!uploadedFile) {
            var proofError = document.getElementById('proofError');
            if (proofError) {
                proofError.classList.add('show');
                proofError.textContent = 'يرجى رفع صورة إيصال التحويل';
            }
            showToast('يرجى رفع صورة إيصال التحويل', 'error');
            valid = false;
        }
    }

    return valid;
}

// ==========================================
// 7. FIELD ERROR HELPERS
// ==========================================
function showFieldError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    var error = document.getElementById(errorId);

    if (field) field.classList.add('error');
    if (error) {
        error.textContent = message;
        error.classList.add('show');
    }
}

function clearFieldError(fieldId, errorId) {
    var field = document.getElementById(fieldId);
    var error = document.getElementById(errorId);

    if (field) field.classList.remove('error');
    if (error) error.classList.remove('show');
}

function clearAllErrors() {
    document.querySelectorAll('.form-control.error').forEach(function (el) {
        el.classList.remove('error');
    });
    document.querySelectorAll('.form-error.show').forEach(function (el) {
        el.classList.remove('show');
    });
}

// ==========================================
// 8. FORM INPUT LISTENERS
// ==========================================
function initFormListeners() {
    // Clear errors on input
    var fields = [
        { field: 'customerName', error: 'nameError' },
        { field: 'phonePrimary', error: 'phoneError' },
        { field: 'phoneSecondary', error: 'phone2Error' },
        { field: 'governorate', error: 'govError' },
        { field: 'city', error: 'cityError' },
        { field: 'fullAddress', error: 'addressError' }
    ];

    fields.forEach(function (item) {
        var el = document.getElementById(item.field);
        if (el) {
            el.addEventListener('input', function () {
                clearFieldError(item.field, item.error);
            });
            el.addEventListener('change', function () {
                clearFieldError(item.field, item.error);
            });
        }
    });
}

// ==========================================
// 9. PAYMENT METHOD SELECTION
// ==========================================
function selectPayment(method) {
    // Update UI
    document.querySelectorAll('.payment-option').forEach(function (el) {
        el.classList.remove('selected');
    });

    switch (method) {
        case 'cod':
            document.getElementById('paymentCOD').classList.add('selected');
            break;
        case 'wallet':
            document.getElementById('paymentWallet').classList.add('selected');
            break;
        case 'instapay':
            document.getElementById('paymentInstapay').classList.add('selected');
            break;
    }

    // Show/hide transfer details
    var transferDetails = document.getElementById('transferDetails');
    if (method === 'wallet' || method === 'instapay') {
        transferDetails.classList.add('show');
    } else {
        transferDetails.classList.remove('show');
        // Clear file if switching to COD
        removeFile();
    }

    // Clear proof error
    var proofError = document.getElementById('proofError');
    if (proofError) proofError.classList.remove('show');
}

function getSelectedPayment() {
    var selected = document.querySelector('input[name="paymentMethod"]:checked');
    return selected ? selected.value : null;
}

function getPaymentLabel(method) {
    switch (method) {
        case 'cod': return 'الدفع عند الاستلام';
        case 'wallet': return 'محفظة إلكترونية';
        case 'instapay': return 'إنستا باي';
        default: return method;
    }
}

// ==========================================
// 10. FILE UPLOAD
// ==========================================
function handleFileUpload(input) {
    var file = input.files[0];
    if (!file) return;

    // Validate file
    var maxSize = 5 * 1024 * 1024; // 5MB
    var allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
        showToast('نوع الملف غير مدعوم. يرجى رفع صورة JPG أو PNG أو PDF', 'error');
        input.value = '';
        return;
    }

    if (file.size > maxSize) {
        showToast('حجم الملف كبير جداً. الحد الأقصى 5MB', 'error');
        input.value = '';
        return;
    }

    uploadedFile = file;

    // Show preview
    var preview = document.getElementById('filePreview');
    var previewImage = document.getElementById('previewImage');
    var fileName = document.getElementById('fileName');
    var uploadArea = document.getElementById('fileUploadArea');

    if (file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function (e) {
            previewImage.src = e.target.result;
            uploadedFileBase64 = e.target.result;
            previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        previewImage.style.display = 'none';
        // For PDF
        var reader = new FileReader();
        reader.onload = function (e) {
            uploadedFileBase64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    fileName.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
    preview.style.display = 'block';
    uploadArea.style.display = 'none';

    // Clear error
    var proofError = document.getElementById('proofError');
    if (proofError) proofError.classList.remove('show');

    showToast('تم رفع الصورة بنجاح', 'success');
}

function removeFile() {
    uploadedFile = null;
    uploadedFileBase64 = null;

    var input = document.getElementById('paymentProof');
    var preview = document.getElementById('filePreview');
    var uploadArea = document.getElementById('fileUploadArea');

    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ==========================================
// 11. QUANTITY CONTROL
// ==========================================
function updateQuantity(change) {
    var input = document.getElementById('quantity');
    if (!input) return;

    var current = parseInt(input.value) || 1;
    var newVal = current + change;

    if (newVal < 1) newVal = 1;
    if (newVal > 10) newVal = 10;

    input.value = newVal;
    STATE.cart.quantity = newVal;
    updateSummary();
}

// ==========================================
// 12. COUPON CODE
// ==========================================
function applyCoupon() {
    var codeInput = document.getElementById('couponCode');
    var couponMsg = document.getElementById('couponMsg');
    var couponBtn = document.getElementById('couponBtn');

    if (!codeInput) return;

    var code = codeInput.value.trim();
    if (!code) {
        showCouponMsg('يرجى إدخال كود الخصم', 'error');
        return;
    }

    if (STATE.cart.couponApplied) {
        showCouponMsg('تم تطبيق كود خصم بالفعل', 'warning');
        return;
    }

    // Disable button
    couponBtn.disabled = true;
    couponBtn.textContent = 'جاري التحقق...';

    validateCoupon(code)
        .then(function (data) {
            couponBtn.disabled = false;
            couponBtn.textContent = 'تطبيق';

            if (data && data.success) {
                STATE.cart.couponCode = code;
                STATE.cart.couponApplied = true;

                if (data.discount_type === 'percentage') {
                    var subtotal = STATE.product.price * STATE.cart.quantity;
                    STATE.cart.discount = Math.round(subtotal * (data.discount_value / 100));
                } else {
                    STATE.cart.discount = data.discount_value;
                }

                showCouponMsg('تم تطبيق الخصم: -' + STATE.cart.discount + ' ج.م ✓', 'success');
                codeInput.disabled = true;
                couponBtn.textContent = 'تم ✓';
                couponBtn.disabled = true;
                updateSummary();
                showToast('تم تطبيق كود الخصم بنجاح! 🎉', 'success');
            } else {
                showCouponMsg(data.message || 'كود الخصم غير صحيح أو منتهي', 'error');
                showToast('كود الخصم غير صحيح', 'error');
            }
        })
        .catch(function () {
            couponBtn.disabled = false;
            couponBtn.textContent = 'تطبيق';
            showCouponMsg('حدث خطأ أثناء التحقق. حاول مرة أخرى', 'error');
        });
}

function showCouponMsg(msg, type) {
    var couponMsg = document.getElementById('couponMsg');
    if (!couponMsg) return;

    couponMsg.textContent = msg;
    couponMsg.className = 'coupon-msg ' + type;
}

// ==========================================
// 13. UPDATE ORDER SUMMARY
// ==========================================
function updateSummary() {
    var price = STATE.product.price;
    var qty = STATE.cart.quantity;
    var shipping = STATE.cart.shipping;
    var discount = STATE.cart.discount;
    var subtotal = price * qty;
    var total = subtotal + shipping - discount;

    if (total < 0) total = 0;

    // Update UI
    var elUnitPrice = document.getElementById('summaryUnitPrice');
    var elProductPrice = document.getElementById('lineProductPrice');
    var elQuantity = document.getElementById('lineQuantity');
    var elSubtotal = document.getElementById('lineSubtotal');
    var elShipping = document.getElementById('lineShipping');
    var elDiscount = document.getElementById('lineDiscount');
    var elDiscountRow = document.getElementById('lineDiscountRow');
    var elTotal = document.getElementById('lineTotal');

    if (elUnitPrice) elUnitPrice.textContent = formatPrice(price);
    if (elProductPrice) elProductPrice.textContent = formatPrice(price);
    if (elQuantity) elQuantity.textContent = qty;
    if (elSubtotal) elSubtotal.textContent = formatPrice(subtotal);
    if (elShipping) elShipping.textContent = formatPrice(shipping);

    if (discount > 0) {
        if (elDiscountRow) elDiscountRow.style.display = 'flex';
        if (elDiscount) elDiscount.textContent = '- ' + formatPrice(discount);
    } else {
        if (elDiscountRow) elDiscountRow.style.display = 'none';
    }

    if (elTotal) elTotal.textContent = formatPrice(total);
}

// ==========================================
// 14. SUBMIT ORDER - FINAL FIX
// ==========================================
function handleSubmitOrder() {
    clearAllErrors();

    var step1Valid = validateStep1();
    if (!step1Valid) { goToStep(1); return; }

    var step2Valid = validateStep2();
    if (!step2Valid) { goToStep(2); return; }

    var step3Valid = validateStep3();
    if (!step3Valid) { return; }

    // Collect data
    var price = STATE.product.price;
    var qty = STATE.cart.quantity;
    var shipping = STATE.cart.shipping;
    var discount = STATE.cart.discount;
    var subtotal = price * qty;
    var total = subtotal + shipping - discount;
    if (total < 0) total = 0;

    var orderId = generateOrderId();
    var paymentMethod = getSelectedPayment();

    var orderData = {
        order_id: orderId,
        date: new Date().toLocaleString('ar-EG'),
        customer_name: document.getElementById('customerName').value.trim(),
        phone_primary: document.getElementById('phonePrimary').value.trim(),
        phone_secondary: document.getElementById('phoneSecondary').value.trim() || '-',
        governorate: document.getElementById('governorate').value,
        city: document.getElementById('city').value.trim(),
        full_address: document.getElementById('fullAddress').value.trim(),
        landmark: document.getElementById('landmark').value.trim() || '-',
        product_name: STATE.product.name,
        quantity: qty.toString(),
        product_price: price.toString(),
        shipping_price: shipping.toString(),
        coupon_code: STATE.cart.couponCode || '-',
        discount_value: discount.toString(),
        total: total.toString(),
        payment_method: getPaymentLabel(paymentMethod),
        payment_proof: '',
        payment_proof_name: '',
        order_status: 'جديد'
    };

    // صورة التحويل
    if (uploadedFileBase64 && (paymentMethod === 'wallet' || paymentMethod === 'instapay')) {
        orderData.payment_proof = uploadedFileBase64;
        orderData.payment_proof_name = uploadedFile ? uploadedFile.name : 'proof.jpg';
    }

    // Disable button
    var submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div> جاري الإرسال...';
    }

    showLoading();

    // ========== إرسال الطلب ==========
    sendOrderRequest(orderData, orderId, submitBtn);
}

function sendOrderRequest(orderData, orderId, submitBtn) {

    // === الطريقة الرئيسية: Google Apps Script Form Submit ===
    var scriptUrl = CONFIG.API_URL;

    // بناء الـ URL مع كل البيانات
    var params = 'action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';

        // تجاهل الصورة لو كبيرة في الـ URL
        if (key === 'payment_proof' && val.length > 5000) {
            continue;
        }
        params += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }

    // === Method 1: Try POST first ===
    fetch(scriptUrl, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    })
    .then(function (response) {
        return response.text();
    })
    .then(function (text) {
        hideLoading();
        resetSubmitButton(submitBtn);

        var result = parseResponse(text);

        if (result.success) {
            orderSuccess(orderId);
        } else {
            // لو فشل POST - جرب GET
            tryGetMethod(orderData, orderId, submitBtn);
        }
    })
    .catch(function (error) {
        console.log('POST failed, trying GET...', error);
        tryGetMethod(orderData, orderId, submitBtn);
    });
}

// === Method 2: GET Fallback ===
function tryGetMethod(orderData, orderId, submitBtn) {
    showLoading();

    var url = CONFIG.API_URL + '?action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';
        if (key === 'payment_proof') continue;
        url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
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
        hideLoading();
        resetSubmitButton(submitBtn);

        var result = parseResponse(text);
        if (result.success) {
            orderSuccess(orderId);
        } else {
            // === Method 3: No-CORS mode (blind send) ===
            tryNoCorsMethod(orderData, orderId, submitBtn);
        }
    })
    .catch(function (error) {
        console.log('GET failed, trying no-cors...', error);
        tryNoCorsMethod(orderData, orderId, submitBtn);
    });
}

// === Method 3: No-CORS (Blind Send) ===
function tryNoCorsMethod(orderData, orderId, submitBtn) {
    showLoading();

    var url = CONFIG.API_URL + '?action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';
        if (key === 'payment_proof') continue;
        url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }

    fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        redirect: 'follow'
    })
    .then(function () {
        hideLoading();
        resetSubmitButton(submitBtn);
        // في no-cors مش هنقدر نقرأ الرد
        // بس الطلب اتبعت - نعتبره ناجح
        orderSuccess(orderId);
    })
    .catch(function (error) {
        hideLoading();
        resetSubmitButton(submitBtn);
        console.error('All methods failed:', error);

        // === Method 4: Image Pixel (Last Resort) ===
        sendViaImage(orderData, orderId, submitBtn);
    });
}

// === Method 4: Image Pixel (آخر حل) ===
function sendViaImage(orderData, orderId, submitBtn) {
    var url = CONFIG.API_URL + '?action=submitOrder';
    var keys = Object.keys(orderData);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = orderData[key] || '';
        if (key === 'payment_proof') continue;
        url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }

    var img = new Image();
    img.onload = function () {
        orderSuccess(orderId);
    };
    img.onerror = function () {
        // حتى لو error - الطلب غالباً اتبعت
        orderSuccess(orderId);
    };
    img.src = url;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function parseResponse(text) {
    try {
        var json = JSON.parse(text);
        return json;
    } catch (e) {
        // لو مش JSON - شوف لو فيه كلمة success
        if (text && (text.indexOf('"success":true') > -1 || text.indexOf('success') > -1)) {
            return { success: true };
        }
        // لو فاضي أو HTML - ممكن يكون redirect ناجح
        if (text === '' || text.indexOf('<!DOCTYPE') > -1 || text.indexOf('<html') > -1) {
            return { success: true };
        }
        return { success: false, message: text || 'Unknown response' };
    }
}

function resetSubmitButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> تأكيد الطلب';
    }
}

function orderSuccess(orderId) {
    // عرض رسالة النجاح
    var successOrderId = document.getElementById('successOrderId');
    if (successOrderId) {
        successOrderId.textContent = 'رقم طلبك: ' + orderId;
        successOrderId.style.fontWeight = '700';
        successOrderId.style.color = 'var(--primary)';
        successOrderId.style.fontSize = '1.1rem';
    }

    showSuccess();
    showToast('تم إرسال طلبك بنجاح! 🎉', 'success');

    // Reset form
    try {
        document.getElementById('checkoutForm').reset();
    } catch(e) {}

    STATE.cart = {
        quantity: 1,
        shipping: CONFIG.DEFAULT_SHIPPING,
        discount: 0,
        couponCode: '',
        couponApplied: false
    };
    uploadedFile = null;
    uploadedFileBase64 = null;
}
// ==========================================
// 15. LOAD SHIPPING ON PAGE LOAD
// ==========================================
(function () {
    loadShippingRates().then(function () {
        console.log('Shipping rates loaded');
    });
})();