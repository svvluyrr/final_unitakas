/* DATA */
let currentUser = { id: null, name: '', mail: '', initial: '' };
let activeFilter = 'Tümü';
let allListings = [];
let uploadedImageUrl = null;

const API_URL = 'http://localhost:8000';

/* AUTH HELPERS */
function switchTab(t) {
    document.querySelectorAll('.tab').forEach((b, i) => b.classList.toggle('on', (i === 0 && t === 'login') || (i === 1 && t === 'register')));
    document.getElementById('lPanel').classList.toggle('on', t === 'login');
    document.getElementById('rPanel').classList.toggle('on', t === 'register');
    document.getElementById('successBlock').classList.remove('show');
    ['lPanel', 'rPanel'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = '' });
}

function syncMail() {
    const n = document.getElementById('rNo').value.trim();
    document.getElementById('rEmail').value = n ? n + '@sinop.edu.tr' : '';
}

/* NAVİGASYON */
function showSection(section, btn) {
    document.getElementById('sectionHome').style.display = 'none';
    document.getElementById('sectionIlanlarim').style.display = 'none';
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (section === 'home') {
        document.getElementById('sectionHome').style.display = '';
    } else if (section === 'ilanlarim') {
        document.getElementById('sectionIlanlarim').style.display = '';
        fetchMyListings();
    }
}

/* LOGIN */
async function doLogin() {
    const email = document.getElementById('lEmail').value.trim();
    const pass = document.getElementById('lPass').value;
    if (!email || pass.length < 6) { alert("E-posta veya şifre hatalı."); return; }
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            const userName = data.user.name || 'Öğrenci';
            currentUser = { id: data.user.id, name: userName, mail: data.user.email, initial: userName.charAt(0).toUpperCase() };
            goHome();
        } else {
            const err = await response.json();
            alert("Hata: " + (err.detail || "Giriş başarısız."));
        }
    } catch (err) { alert("Sunucuya ulaşılamadı."); }
}

/* REGISTER */
async function doRegister() {
    const email = document.getElementById('rEmail').value;
    const password = document.getElementById('rPass').value;
    const pass2 = document.getElementById('rPass2').value;
    if (!email.endsWith("@sinop.edu.tr")) { alert("Sadece @sinop.edu.tr uzantılı okul maili ile kayıt olabilirsin!"); return; }
    if (password !== pass2) { alert("Şifreler eşleşmiyor!"); return; }
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: document.getElementById('rName').value.trim() })
        });
        if (response.ok) {
            document.getElementById('rPanel').style.display = 'none';
            document.getElementById('successBlock').classList.add('show');
        } else {
            const err = await response.json();
            alert("Hata: " + (err.detail || "Kayıt başarısız."));
        }
    } catch (err) { alert("Sunucuya ulaşılamadı."); }
}

/* GO HOME */
async function goHome() {
    document.getElementById('authPage').classList.remove('active');
    document.getElementById('homePage').classList.add('active');
    const displayName = currentUser.name || 'Öğrenci';
    document.getElementById('greetTxt').textContent = `Merhaba, ${displayName} 👋`;
    document.getElementById('navAvatar').textContent = currentUser.initial || 'Ö';
    document.getElementById('sideAvatar').textContent = currentUser.initial || 'Ö';
    document.getElementById('sideUserName').textContent = displayName;
    document.getElementById('sideUserMail').textContent = currentUser.mail;
    showSection('home', document.querySelector('.nav-link'));
    await fetchListings();
    showToast('🎉', 'Hoş geldin!');
}

/* İLANLARI ÇEKME */
async function fetchListings() {
    try {
        const response = await fetch(`${API_URL}/listings/`);
        if (response.ok) { allListings = await response.json(); renderListings(allListings); }
    } catch (err) { console.error("İlanlar yüklenemedi:", err); }
}

async function fetchMyListings() {
    const grid = document.getElementById('myListingsGrid');
    grid.innerHTML = '<div style="color:var(--muted);padding:20px;">Yükleniyor...</div>';
    try {
        const response = await fetch(`${API_URL}/listings/my/${currentUser.id}`);
        if (response.ok) { renderMyListings(await response.json()); }
    } catch (err) { grid.innerHTML = '<div style="color:var(--muted);padding:20px;">Yüklenemedi.</div>'; }
}

/* FILTER */
function setFilter(btn, cat) {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    activeFilter = cat;
    renderListings(cat === 'Tümü' ? allListings : allListings.filter(l => l.category === cat));
}

function filterCards(query) {
    const q = query.toLowerCase();
    renderListings(allListings.filter(l =>
        (activeFilter === 'Tümü' || l.category === activeFilter) &&
        (l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q))
    ));
}

/* LOGOUT */
function doLogout() {
    localStorage.removeItem('token');
    currentUser = { id: null, name: '', mail: '', initial: '' };
    document.getElementById('homePage').classList.remove('active');
    document.getElementById('authPage').classList.add('active');
    switchTab('login');
}

/* PHOTOS */
const PHOTOS = {
    'Kitap': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=200&fit=crop',
    'Not': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop',
    'Elektronik': 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=200&fit=crop',
    'Eşya': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=200&fit=crop'
};
function getPhoto(listing) {
    if (listing.image_url) return `${API_URL}${listing.image_url}`;
    return PHOTOS[listing.category] || PHOTOS['Kitap'];
}

/* YENİ İLAN MODAL */
function showNewListingModal() {
    uploadedImageUrl = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imagePreview').src = '';
    document.getElementById('nlImage').value = '';
    document.getElementById('newListingModal').style.display = 'flex';
}
function closeNewListingModal() {
    document.getElementById('newListingModal').style.display = 'none';
}

/* FOTOĞRAF YÜKLEME */
async function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const label = document.getElementById('uploadLabel');
    label.textContent = '⏳ Yükleniyor...';

    try {
        const response = await fetch(`${API_URL}/upload-image`, {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            uploadedImageUrl = data.url;
            const preview = document.getElementById('imagePreview');
            preview.src = `${API_URL}${data.url}`;
            preview.style.display = 'block';
            label.textContent = '✅ Fotoğraf yüklendi';
        } else {
            label.textContent = '📷 Fotoğraf Ekle';
            alert("Fotoğraf yüklenemedi.");
        }
    } catch (err) {
        label.textContent = '📷 Fotoğraf Ekle';
        alert("Sunucuya ulaşılamadı.");
    }
}

/* İLAN OLUŞTURMA */
async function submitListing() {
    const title = document.getElementById('nlTitle').value.trim();
    const description = document.getElementById('nlDesc').value.trim();
    const category = document.getElementById('nlCategory').value;
    const listing_type = document.getElementById('nlType').value;
    const price = document.getElementById('nlPrice').value.trim();

    if (!title || !description || !price) { alert("Lütfen tüm alanları doldurun."); return; }
    if (!currentUser.id) { alert("Lütfen önce giriş yapın."); return; }

    try {
        const response = await fetch(`${API_URL}/listings/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, category, listing_type, price, image_url: uploadedImageUrl, owner_id: currentUser.id })
        });
        if (response.ok) {
            closeNewListingModal();
            document.getElementById('nlTitle').value = '';
            document.getElementById('nlDesc').value = '';
            document.getElementById('nlPrice').value = '';
            uploadedImageUrl = null;
            await fetchListings();
            showToast('✅', 'İlan başarıyla oluşturuldu!');
        } else {
            const err = await response.json();
            alert("Hata: " + (err.detail || "İlan oluşturulamadı."));
        }
    } catch (err) { alert("Sunucuya ulaşılamadı."); }
}

/* İLAN SİLME */
async function deleteListing(id) {
    if (!confirm("Bu ilanı silmek istediğine emin misin?")) return;
    try {
        const response = await fetch(`${API_URL}/listings/${id}?owner_id=${currentUser.id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('🗑️', 'İlan silindi.');
            fetchMyListings();
            fetchListings();
        } else {
            const err = await response.json();
            alert("Hata: " + (err.detail || "Silinemedi."));
        }
    } catch (err) { alert("Sunucuya ulaşılamadı."); }
}

/* RENDER */
function renderListings(data) {
    const grid = document.getElementById('listingsGrid');
    grid.innerHTML = '';
    if (data.length === 0) { grid.innerHTML = '<div style="color:var(--muted);font-size:14px;padding:20px;">Henüz ilan yok.</div>'; return; }
    data.forEach((l, i) => {
        const priceClass = (l.price === 'Takas' || l.price === 'Ücretsiz') ? 'free' : '';
        const ownerName = l.owner_name || 'Kullanıcı';
        grid.innerHTML += `
            <div class="listing-card" style="animation-delay:${i * 0.05}s;cursor:pointer;" onclick="openDetailModal(${JSON.stringify(l).replace(/"/g, '&quot;')})">
                <div class="lc-img" style="background-image:url('${getPhoto(l)}');background-size:cover;background-position:center;">
                    <span class="lc-cat">${l.category}</span>
                    <span class="lc-type ${l.listing_type}">${l.listing_type === 'takas' ? 'Takas' : 'Satış'}</span>
                </div>
                <div class="lc-body">
                    <div class="lc-title">${l.title}</div>
                    <div class="lc-desc">${l.description}</div>
                    <div class="lc-footer">
                        <span class="lc-price ${priceClass}">${l.price}</span>
                        <div class="lc-user"><div class="lc-av">${ownerName.charAt(0).toUpperCase()}</div>${ownerName}</div>
                    </div>
                </div>
            </div>`;
    });
}

function renderMyListings(data) {
    const grid = document.getElementById('myListingsGrid');
    grid.innerHTML = '';
    if (data.length === 0) {
        grid.innerHTML = '<div style="color:var(--muted);font-size:14px;padding:20px;">Henüz ilan vermediniz. <button class="ga-btn primary" style="margin-left:10px" onclick="showNewListingModal()">+ İlan Ver</button></div>';
        return;
    }
    data.forEach((l, i) => {
        const priceClass = (l.price === 'Takas' || l.price === 'Ücretsiz') ? 'free' : '';
        grid.innerHTML += `
            <div class="listing-card" style="animation-delay:${i * 0.05}s">
                <div class="lc-img" style="background-image:url('${getPhoto(l)}');background-size:cover;background-position:center;">
                    <span class="lc-cat">${l.category}</span>
                    <span class="lc-type ${l.listing_type}">${l.listing_type === 'takas' ? 'Takas' : 'Satış'}</span>
                </div>
                <div class="lc-body">
                    <div class="lc-title">${l.title}</div>
                    <div class="lc-desc">${l.description}</div>
                    <div class="lc-footer">
                        <span class="lc-price ${priceClass}">${l.price}</span>
                        <button onclick="deleteListing(${l.id})" style="background:#e74c3c;color:#fff;border:none;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:13px;">🗑️ Sil</button>
                    </div>
                </div>
            </div>`;
    });
}

function showToast(ico, msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastIco').textContent = ico;
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

let activeListingId = null;
let activeListingOwnerMail = '';

function openDetailModal(listing) {
    activeListingId = listing.id;
    activeListingOwnerMail = listing.owner_mail || '';
    document.getElementById('detailImg').style.backgroundImage = `url('${getPhoto(listing)}')`;
    document.getElementById('detailCat').textContent = listing.category;
    document.getElementById('detailTitle').textContent = listing.title;
    document.getElementById('detailDesc').textContent = listing.description;
    document.getElementById('detailPrice').textContent = listing.price;
    document.getElementById('detailOwner').textContent = '👤 ' + (listing.owner_name || 'Kullanıcı');
    document.getElementById('commentInput').value = '';
    document.getElementById('listingDetailModal').style.display = 'flex';
    fetchComments(listing.id);
}

function closeDetailModal() {
    document.getElementById('listingDetailModal').style.display = 'none';
}

async function fetchComments(listingId) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '<div style="color:var(--muted);font-size:13px;">Yükleniyor...</div>';
    try {
        const res = await fetch(`${API_URL}/comments/${listingId}`);
        const data = await res.json();
        if (data.length === 0) {
            list.innerHTML = '<div style="color:var(--muted);font-size:13px;">Henüz yorum yok.</div>';
            return;
        }
        list.innerHTML = data.map(c => `
            <div style="background:var(--card);border-radius:10px;padding:10px 14px;margin-bottom:8px;">
                <strong style="font-size:13px;">${c.yazar}</strong>
                <p style="margin:4px 0 0;font-size:13px;color:var(--muted);">${c.content}</p>
            </div>`).join('');
    } catch (e) {
        list.innerHTML = '<div style="color:var(--muted);font-size:13px;">Yüklenemedi.</div>';
    }
}

async function submitComment() {
    const content = document.getElementById('commentInput').value.trim();
    if (!content) { showToast('⚠️', 'Yorum boş olamaz!'); return; }
    if (!currentUser.id) { showToast('⚠️', 'Lütfen giriş yapın.'); return; }
    try {
        const res = await fetch(`${API_URL}/comments/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, owner_id: currentUser.id, listing_id: activeListingId })
        });
        if (res.ok) {
            document.getElementById('commentInput').value = '';
            fetchComments(activeListingId);
            showToast('✅', 'Yorum eklendi!');
        } else {
            const err = await res.json();
            showToast('❌', err.detail || 'Hata oluştu.');
        }
    } catch (e) { showToast('❌', 'Sunucuya ulaşılamadı.'); }
}

function contactOwner() {
    window.location.href = `mailto:${activeListingOwnerMail}`;
}

// Sayfa yüklendiğinde ilanları getir
window.onload = function() {
    fetch('/listings/')
        .then(response => response.json())
        .then(data => {
            const grid = document.getElementById("listingsGrid");
            grid.innerHTML = ""; // İçeriği temizle
            data.forEach(listing => {
                // Burada her bir ilan için kart oluşturuyorsun
                grid.innerHTML += `... kart HTML'in ...`;
            });
        });
};
async function contactOwner(listingId, ownerEmail) {
    // Kullanıcıdan mesaj alabilirsin veya sabit bir metin gönderebilirsin
    const message = prompt("İlan sahibiyle ne paylaşmak istersin?");
    
    if (!message) return;

    const payload = {
        listing_id: listingId,
        owner_email: ownerEmail,
        message: message,
        sender_name: "Zeynep" // Varsa giriş yapan kullanıcının adını buraya çekebilirsin
    };

    try {
        const response = await fetch('http://localhost:8000/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("İlan sahibine bildirim gönderildi!");
        } else {
            alert("Bir hata oluştu.");
        }
    } catch (error) {
        console.error("Hata:", error);
    }
}