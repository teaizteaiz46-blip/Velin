// ⚠️ مفاتيح Supabase الخاصة بك
const SUPABASE_URL = 'https://pajxormplmloivyankji.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhanhvcm1wbG1sb2l2eWFua2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ3OTksImV4cCI6MjA3NjA2MDc5OX0.eEPB_Gt5HywU9oGNXLpSNc4IA7CTTL7CX-EMKDE3yec'; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// متغيرات التحكم في التمرير (Scrolling)
let currentOffset = 0;
const LIMIT = 10; // عدد المنتجات في كل دفعة
let hasMoreProducts = true;
let isLoading = false;

// متغيرات السلة
let cart = JSON.parse(localStorage.getItem('velin_cart')) || [];

// === 1. نظام جلب المنتجات (Infinite Scroll) ===

async function fetchProducts() {
    if (isLoading || !hasMoreProducts) return;
    
    isLoading = true;
    document.getElementById('sentinel').style.display = 'block'; // إظهار أيقونة التحميل

    try {
        // جلب المنتجات من x إلى y (نظام النطاق range)
        // ومخزونها أكبر من 0
        let { data: products, error } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0)
            .range(currentOffset, currentOffset + LIMIT - 1)
            .order('id', { ascending: false }); // الأحدث أولاً

        if (error) throw error;

        const container = document.getElementById('products-grid');

        if (products.length < LIMIT) {
            hasMoreProducts = false; // لا يوجد المزيد
            document.getElementById('end-of-products').style.display = 'block';
        }

        if (products.length > 0) {
            products.forEach(product => {
                const imageUrl = product.image_url || 'https://via.placeholder.com/250';
                
                // إنشاء كرت المنتج
                const div = document.createElement('div');
                div.className = 'product-card';
                div.innerHTML = `
                    <img src="${imageUrl}" class="product-image" loading="lazy" alt="${product.name}">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <p class="product-price">${product.price.toLocaleString()} د.ع</p>
                            <span style="font-size:0.8rem; color:#888;">متبقي: ${product.stock}</span>
                        </div>
                        <button onclick="addToCart(${product.id}, '${product.name}', ${product.price})" class="btn btn-primary">
                            أضف للسلة <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                `;
                container.appendChild(div);
            });
            
            // زيادة العداد للدفعة القادمة
            currentOffset += LIMIT;
        }

    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        isLoading = false;
        document.getElementById('sentinel').style.display = 'none';
    }
}

// === 2. مراقب التمرير (Intersection Observer) ===
// هذه الوظيفة تراقب متى يصل المستخدم لأسفل الصفحة
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        fetchProducts();
    }
}, { rootMargin: '100px' }); // يبدأ التحميل قبل الوصول للنهاية بـ 100px

// === 3. منطق السلة (Cart Logic) ===

function addToCart(id, name, price) {
    // تخزين السعر كرقم صافي لضمان الحسابات الصحيحة
    cart.push({ 
        productId: id, 
        name: name, 
        price: Number(price), 
        cartId: Date.now() 
    });
    saveCart();
    updateCartUI();
    alert('تمت الإضافة: ' + name);
}

function removeFromCart(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('velin_cart', JSON.stringify(cart));
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('show-checkout-btn');
    
    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">السلة فارغة</p>';
        checkoutBtn.style.display = 'none';
    } else {
        cart.forEach(item => {
            total += item.price;
            container.innerHTML += `
                <div class="cart-item">
                    <div>
                        <strong>${item.name}</strong>
                        <div>${item.price.toLocaleString()} د.ع</div>
                    </div>
                    <i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="removeFromCart(${item.cartId})"></i>
                </div>
            `;
        });
        checkoutBtn.style.display = 'block';
    }
    
    totalEl.innerText = total.toLocaleString() + ' د.ع';
}

function toggleCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

function showCheckout() {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('show-checkout-btn').style.display = 'none';
}

// === 4. إرسال الطلب (متوافق مع صورة الداتابيز) ===

document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "جاري الإرسال...";

    // حساب المجموع كرقم صافي
    const numericTotal = cart.reduce((sum, item) => sum + item.price, 0);

    // تجهيز عناصر السلة كـ JSON
    // العمود في الصورة هو cart_items ونوعه jsonb
    const cartItemsJson = cart.map(item => ({
        product_id: item.productId,
        name: item.name,
        price: item.price
    }));

    const orderData = {
        customer_name: document.getElementById('customer_name').value,
        customer_phone: document.getElementById('customer_phone').value,
        customer_address: document.getElementById('customer_address').value,
        price: numericTotal,    // ✅ رقم (numeric)
        cart_items: cartItemsJson, // ✅ مصفوفة JSON (jsonb)
        status: 'new' // حالة افتراضية
    };

    try {
        // 1. إرسال الطلب
        const { error } = await supabase.from('orders').insert([orderData]);
        if (error) throw error;

        // 2. إنقاص المخزون
        for (const item of cart) {
            await supabase.rpc('decrease_stock', { row_id: item.productId });
        }

        alert("تم الطلب بنجاح!");
        cart = [];
        saveCart();
        updateCartUI();
        toggleCart();
        location.reload(); // إعادة تحميل الصفحة لتحديث المخزون

    } catch (err) {
        console.error("Order Error:", err);
        alert("حدث خطأ: " + (err.message || "تأكد من البيانات"));
    } finally {
        btn.disabled = false;
        btn.innerText = "تأكيد الطلب";
    }
});

// بدء التشغيل
document.addEventListener('DOMContentLoaded', () => {
    // تشغيل المراقب للعنصر السفلي
    observer.observe(document.getElementById('sentinel'));
    // تحميل أول دفعة
    fetchProducts();
    updateCartUI();
});
