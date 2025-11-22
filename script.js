// ⚠️ 1. إعدادات الاتصال (انسخها من لوحة تحكم Supabase -> Settings -> API)
const SUPABASE_URL = 'https://pajxormplmloivyankji.supabase.co'; // ضع رابطك هنا
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhanhvcm1wbG1sb2l2eWFua2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODQ3OTksImV4cCI6MjA3NjA2MDc5OX0.eEPB_Gt5HywU9oGNXLpSNc4IA7CTTL7CX-EMKDE3yec'; // ضع مفتاح anon/public هنا

// ⚠️ تأكد من وضع مفاتيحك الصحيحة هنا

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. دالة جلب المنتجات ---
async function fetchProducts() {
    const productsContainer = document.getElementById('products-grid');
    
    try {
        let { data: products, error } = await supabase
            .from('products') // تأكد من اسم الجدول
            .select('*');

        if (error) throw error;

        productsContainer.innerHTML = '';

        if (!products || products.length === 0) {
            productsContainer.innerHTML = '<p>لا توجد منتجات حالياً.</p>';
            return;
        }

        products.forEach(product => {
            const imageUrl = product.image_url || 'https://via.placeholder.com/250';
            
            // قمنا بإضافة زر "اطلب الآن" الذي يستدعي دالة openModal
            const productHTML = `
                <div class="product-card">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-price">${product.price} د.ع</p>
                        <button onclick="openModal('${product.name}', '${product.price}')" class="btn btn-primary" style="width:100%; margin-top:10px;">
                            اطلب الآن <i class="fa-solid fa-cart-shopping"></i>
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

// --- 2. دوال النافذة المنبثقة (Modal) ---
const modal = document.getElementById('orderModal');

// فتح النافذة وتعبئة بيانات المنتج المخفية
function openModal(productName, productPrice) {
    document.getElementById('modal-product-name').innerText = productName + " - " + productPrice + " د.ع";
    
    // تخزين البيانات في حقول مخفية لنرسلها لاحقاً
    document.getElementById('hidden_product_name').value = productName;
    document.getElementById('hidden_product_price').value = productPrice;
    
    modal.style.display = 'flex';
}

// إغلاق النافذة
function closeModal() {
    modal.style.display = 'none';
}

// إغلاق النافذة عند الضغط خارجها
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// --- 3. دالة إرسال الطلب إلى Supabase ---
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // منع إعادة تحميل الصفحة
    
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "جاري الإرسال...";
    btn.disabled = true;

    // جمع البيانات
    const orderData = {
        customer_name: document.getElementById('customer_name').value,
        customer_phone: document.getElementById('customer_phone').value,
        customer_address: document.getElementById('customer_address').value,
        product_name: document.getElementById('hidden_product_name').value,
        price: document.getElementById('hidden_product_price').value,
        // created_at يتم إضافته تلقائياً من Supabase
    };

    try {
        // إرسال لجدول orders
        const { error } = await supabase
            .from('orders')
            .insert([orderData]);

        if (error) throw error;

        alert("تم استلام طلبك بنجاح! سنتواصل معك قريباً.");
        closeModal();
        e.target.reset(); // مسح الحقول

    } catch (err) {
        console.error("Order Error:", err);
        alert("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// تشغيل الموقع
document.addEventListener('DOMContentLoaded', fetchProducts);