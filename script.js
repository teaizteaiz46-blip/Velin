// ⚠️ إعدادات Supabase (نفس مفاتيحك السابقة)
const SUPABASE_URL = 'https://pajxormplmloivyankji.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhanhvcm1wbG1sb2l2eWFua2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ3OTksImV4cCI6MjA3NjA2MDc5OX0.eEPB_Gt5HywU9oGNXLpSNc4IA7CTTL7CX-EMKDE3yec'; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. إدارة السلة (Cart Logic) ---
let cart = JSON.parse(localStorage.getItem('velin_cart')) || [];

// تحديث أيقونة السلة عند التحميل
updateCartUI();

// دالة إضافة للسلة (قمنا بتعديلها لتستقبل معرف المنتج الأصلي id)
function addToCart(id, name, price) {
    // تخزين المنتج مع الاحتفاظ بمعرفه الأصلي في قاعدة البيانات (productId)
    const product = { productId: id, name, price, cartId: Date.now() }; 
    cart.push(product);
    saveCart();
    updateCartUI();
    
    alert('تمت إضافة ' + name + ' إلى السلة');
}

// حذف من السلة
function removeFromCart(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    saveCart();
    updateCartUI();
}

// حفظ في الذاكرة المحلية
function saveCart() {
    localStorage.setItem('velin_cart', JSON.stringify(cart));
}

// تحديث الواجهة (الرقم والقائمة)
function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;

    const cartContainer = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('show-checkout-btn');
    
    cartContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-msg">السلة فارغة، أضيفي بعض المنتجات!</p>';
        if(checkoutBtn) checkoutBtn.style.display = 'none';
    } else {
        cart.forEach(item => {
            let priceNum = parseFloat(item.price.replace(/[^0-9.-]+/g,""));
            total += priceNum;

            cartContainer.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.price} د.ع</p>
                    </div>
                    <span class="remove-item" onclick="removeFromCart(${item.cartId})">
                        <i class="fa-solid fa-trash"></i>
                    </span>
                </div>
            `;
        });
        if(checkoutBtn) checkoutBtn.style.display = 'block';
    }

    if(totalPriceEl) totalPriceEl.innerText = total.toLocaleString() + ' د.ع';
}

// فتح وإغلاق السلة
function toggleCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

function showCheckout() {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('show-checkout-btn').style.display = 'none';
}


// --- 2. دالة جلب المنتجات (تعديل: إخفاء المنتجات المنتهية) ---
async function fetchProducts() {
    const productsContainer = document.getElementById('products-grid');
    
    try {
        let { data: products, error } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0); // ⚠️ هذا السطر السحري: يجلب فقط المنتجات التي مخزونها أكبر من 0

        if (error) throw error;

        productsContainer.innerHTML = '';

        if (!products || products.length === 0) {
            productsContainer.innerHTML = '<p>جميع المنتجات نفدت حالياً!</p>';
            return;
        }

        products.forEach(product => {
            const imageUrl = product.image_url || 'https://via.placeholder.com/250';
            
            // نمرر product.id للدالة حتى نعرف أي منتج سننقص من مخزونه
            const productHTML = `
                <div class="product-card">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-price">${product.price} د.ع</p>
                        <p style="font-size:0.8rem; color:#777;">المتبقي: ${product.stock} قطعة</p>
                        <button onclick="addToCart(${product.id}, '${product.name}', '${product.price}')" class="btn btn-primary w-100">
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

// --- 3. إرسال الطلب وإنقاص المخزون ---
document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button');
    btn.innerText = "جاري المعالجة...";
    btn.disabled = true;

    const productSummary = cart.map(item => item.name).join(" + ");
    const totalPrice = document.getElementById('total-price').innerText;

    const orderData = {
        customer_name: document.getElementById('customer_name').value,
        customer_phone: document.getElementById('customer_phone').value,
        customer_address: document.getElementById('customer_address').value,
        product_name: productSummary,
        price: totalPrice,
    };

    try {
        // 1. تسجيل الطلب في جدول الطلبات
        const { error: orderError } = await supabase
            .from('orders')
            .insert([orderData]);

        if (orderError) throw orderError;

        // 2. إنقاص المخزون لكل منتج في السلة
        // نستخدم حلقة تكرار لاستدعاء الدالة التي أنشأناها في قاعدة البيانات
        for (const item of cart) {
            const { error: rpcError } = await supabase
                .rpc('decrease_stock', { row_id: item.productId });
            
            if (rpcError) console.error("خطأ في إنقاص المخزون للمنتج:", item.name, rpcError);
        }

        alert("تم الطلب بنجاح! سيتم توصيل طلبيتك قريباً.");
        
        // تفريغ السلة وإعادة التوجيه
        cart = [];
        saveCart();
        updateCartUI();
        toggleCart();
        e.target.reset(); 
        document.getElementById('checkoutForm').style.display = 'none';
        
        // إعادة تحميل المنتجات لتحديث أرقام المخزون في الصفحة
        fetchProducts();

    } catch (err) {
        console.error("Checkout Error:", err);
        alert("حدث خطأ أثناء الطلب، يرجى المحاولة مرة أخرى.");
    } finally {
        btn.innerText = "تأكيد الطلب (دفع عند الاستلام)";
        btn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', fetchProducts);
