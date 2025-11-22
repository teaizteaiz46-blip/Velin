// ⚠️ 1. إعدادات الاتصال (انسخها من لوحة تحكم Supabase -> Settings -> API)
const SUPABASE_URL = 'https://pajxormplmloivyankji.supabase.co'; // ضع رابطك هنا
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhanhvcm1wbG1sb2l2eWFua2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ3OTksImV4cCI6MjA3NjA2MDc5OX0.eEPB_Gt5HywU9oGNXLpSNc4IA7CTTL7CX-EMKDE3yec'; // ضع مفتاح anon/public هنا
// ⚠️ إعدادات Supabase (نفس مفاتيحك السابقة)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. إدارة السلة (Cart Logic) ---
let cart = JSON.parse(localStorage.getItem('velin_cart')) || [];

// تحديث أيقونة السلة عند التحميل
updateCartUI();

// دالة إضافة للسلة
function addToCart(name, price) {
    const product = { name, price, id: Date.now() }; // id مميز لكل قطعة
    cart.push(product);
    saveCart();
    updateCartUI();
    
    // تنبيه بسيط
    alert('تمت إضافة ' + name + ' إلى السلة');
}

// حذف من السلة
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
}

// حفظ في الذاكرة المحلية
function saveCart() {
    localStorage.setItem('velin_cart', JSON.stringify(cart));
}

// تحديث الواجهة (الرقم والقائمة)
function updateCartUI() {
    // 1. تحديث الرقم الأحمر
    document.getElementById('cart-count').innerText = cart.length;

    // 2. تحديث قائمة المنتجات داخل النافذة
    const cartContainer = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('show-checkout-btn');
    
    cartContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-msg">السلة فارغة، أضيفي بعض المنتجات!</p>';
        checkoutBtn.style.display = 'none';
    } else {
        cart.forEach(item => {
            // تحويل السعر لرقم للجمع
            let priceNum = parseFloat(item.price.replace(/[^0-9.-]+/g,""));
            total += priceNum;

            cartContainer.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.price} د.ع</p>
                    </div>
                    <span class="remove-item" onclick="removeFromCart(${item.id})">
                        <i class="fa-solid fa-trash"></i>
                    </span>
                </div>
            `;
        });
        checkoutBtn.style.display = 'block';
    }

    totalPriceEl.innerText = total.toLocaleString() + ' د.ع';
}

// فتح وإغلاق السلة
function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
    }
}

function showCheckout() {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('show-checkout-btn').style.display = 'none';
}


// --- 2. دالة جلب المنتجات ---
async function fetchProducts() {
    const productsContainer = document.getElementById('products-grid');
    
    try {
        let { data: products, error } = await supabase
            .from('products')
            .select('*');

        if (error) throw error;

        productsContainer.innerHTML = '';

        products.forEach(product => {
            const imageUrl = product.image_url || 'https://via.placeholder.com/250';
            
            // زر "أضف للسلة" بدلاً من "اطلب الآن"
            const productHTML = `
                <div class="product-card">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-price">${product.price} د.ع</p>
                        <button onclick="addToCart('${product.name}', '${product.price}')" class="btn btn-primary w-100">
                            أضف للسلة <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
            `;
            productsContainer.innerHTML += productHTML;
        });

    } catch (err) {
        console.error('Error:', err);
        productsContainer.innerHTML = '<p>حدث خطأ في تحميل المنتجات.</p>';
    }
}

// --- 3. إرسال الطلب (المنتجات كلها مرة واحدة) ---
document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button');
    btn.innerText = "جاري الإرسال...";
    btn.disabled = true;

    // تحويل قائمة المنتجات إلى نص واحد (مثلاً: حجاب x2, عباية x1)
    const productSummary = cart.map(item => item.name).join(" + ");
    const totalPrice = document.getElementById('total-price').innerText;

    const orderData = {
        customer_name: document.getElementById('customer_name').value,
        customer_phone: document.getElementById('customer_phone').value,
        customer_address: document.getElementById('customer_address').value,
        product_name: productSummary, // نرسل كل المنتجات في حقل الاسم
        price: totalPrice,            // نرسل المجموع الكلي
    };

    try {
        const { error } = await supabase
            .from('orders')
            .insert([orderData]);

        if (error) throw error;

        alert("تم استلام طلبك بنجاح! شكراً لتسوقك مع فيلين.");
        
        // تفريغ السلة
        cart = [];
        saveCart();
        updateCartUI();
        toggleCart(); // إغلاق النافذة
        e.target.reset(); 
        document.getElementById('checkoutForm').style.display = 'none';

    } catch (err) {
        console.error("Order Error:", err);
        alert("حدث خطأ، يرجى المحاولة مرة أخرى.");
    } finally {
        btn.innerText = "تأكيد الطلب";
        btn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', fetchProducts);
