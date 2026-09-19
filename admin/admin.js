(function () {
  "use strict";

  var state = { content: null };

  var loginScreen = document.getElementById("login-screen");
  var dashboard = document.getElementById("dashboard");
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var logoutBtn = document.getElementById("logout-btn");

  /* ===== Templates ===== */
  function fromTemplate(id) {
    var tpl = document.getElementById(id);
    return tpl.content.firstElementChild.cloneNode(true);
  }

  /* ===== Auth ===== */
  function showLogin() {
    loginScreen.hidden = false;
    dashboard.hidden = true;
  }

  function showDashboard() {
    loginScreen.hidden = true;
    dashboard.hidden = false;
  }

  function checkSession() {
    fetch("/api/session")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.authenticated) loadDashboard();
        else showLogin();
      })
      .catch(showLogin);
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var password = document.getElementById("login-password").value;
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("bad login");
        return r.json();
      })
      .then(function () {
        loginForm.reset();
        loadDashboard();
      })
      .catch(function () {
        loginError.textContent = "סיסמה שגויה, נסו שוב.";
        loginError.hidden = false;
      });
  });

  logoutBtn.addEventListener("click", function () {
    fetch("/api/logout", { method: "POST" }).then(showLogin);
  });

  /* ===== Tabs ===== */
  document.querySelectorAll(".admin-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".admin-tab").forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      var name = tab.getAttribute("data-tab");
      document.querySelectorAll(".admin-panel").forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-panel") === name);
      });
    });
  });

  /* ===== Save plumbing ===== */
  function showStatus(section, text, isError) {
    var el = document.querySelector('[data-status="' + section + '"]');
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "#B03A2E" : "";
    if (!isError) setTimeout(function () { el.textContent = ""; }, 2500);
  }

  function saveContent(section, patch) {
    var next = Object.assign({}, state.content, patch);
    var btn = document.querySelector('.save-btn[data-save="' + section + '"]');
    if (btn) btn.disabled = true;
    showStatus(section, "שומר…");
    return fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("save failed");
        return r.json();
      })
      .then(function (saved) {
        state.content = saved;
        showStatus(section, "נשמר ✓");
      })
      .catch(function () {
        showStatus(section, "שגיאה בשמירה — נסו שוב", true);
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  /* ===== General tab ===== */
  function renderGeneral(content) {
    document.getElementById("f-hero-eyebrow").value = content.hero.eyebrow || "";
    document.getElementById("f-hero-title").value = content.hero.title || "";
    document.getElementById("f-hero-subtitle").value = content.hero.subtitle || "";
    document.getElementById("f-seo-title").value = content.seo.title || "";
    document.getElementById("f-seo-description").value = content.seo.description || "";

    var wrap = document.getElementById("story-paragraphs-editor");
    wrap.textContent = "";
    (content.story.paragraphs.length ? content.story.paragraphs : [""]).forEach(addParagraphRow);
  }

  function addParagraphRow(text) {
    var row = fromTemplate("tpl-paragraph");
    row.querySelector(".p-input").value = text || "";
    row.querySelector(".remove-btn").addEventListener("click", function () { row.remove(); });
    document.getElementById("story-paragraphs-editor").appendChild(row);
  }
  document.getElementById("add-paragraph").addEventListener("click", function () { addParagraphRow(""); });

  function collectGeneral() {
    return {
      hero: {
        eyebrow: document.getElementById("f-hero-eyebrow").value,
        title: document.getElementById("f-hero-title").value,
        subtitle: document.getElementById("f-hero-subtitle").value,
      },
      story: {
        paragraphs: Array.prototype.map
          .call(document.querySelectorAll("#story-paragraphs-editor .p-input"), function (t) { return t.value.trim(); })
          .filter(Boolean),
      },
      seo: {
        title: document.getElementById("f-seo-title").value,
        description: document.getElementById("f-seo-description").value,
      },
    };
  }

  document.querySelector('.save-btn[data-save="general"]').addEventListener("click", function () {
    saveContent("general", collectGeneral());
  });

  /* ===== Gallery tab ===== */
  function renderGallery(content) {
    var wrap = document.getElementById("gallery-editor");
    wrap.textContent = "";
    (content.gallery || []).forEach(addGalleryItem);
  }

  function addGalleryItem(g) {
    var li = fromTemplate("tpl-gallery-item");
    li.setAttribute("data-url", g.url);
    li.querySelector(".thumb").src = g.url;
    li.querySelector(".alt-input").value = g.alt || "";
    li.querySelector(".alt-input").addEventListener("blur", function () {
      saveContent("gallery", { gallery: collectGallery() });
    });
    li.querySelector(".remove-btn").addEventListener("click", function () {
      var url = li.getAttribute("data-url");
      li.remove();
      saveContent("gallery", { gallery: collectGallery() });
      if (url && url.indexOf("blob.vercel-storage.com") !== -1) {
        fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url }),
        }).catch(function () {});
      }
    });
    document.getElementById("gallery-editor").appendChild(li);
  }

  function collectGallery() {
    return Array.prototype.map.call(document.querySelectorAll("#gallery-editor .gallery-editor-item"), function (li) {
      return { url: li.getAttribute("data-url"), alt: li.querySelector(".alt-input").value };
    });
  }

  document.getElementById("gallery-upload-input").addEventListener("change", function (e) {
    var file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("התמונה גדולה מדי (מעל 4MB). נסו קובץ קטן יותר.");
      return;
    }
    showStatus("gallery", "מעלה תמונה…");
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(",")[1];
      fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, dataBase64: base64 }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("upload failed");
          return r.json();
        })
        .then(function (data) {
          addGalleryItem({ url: data.url, alt: "" });
          return saveContent("gallery", { gallery: collectGallery() });
        })
        .catch(function () {
          showStatus("gallery", "שגיאה בהעלאה — נסו שוב", true);
        });
    };
    reader.readAsDataURL(file);
  });

  /* ===== Menu tab ===== */
  function renderMenu(content) {
    var wrap = document.getElementById("menu-editor");
    wrap.textContent = "";
    (content.menu.categories || []).forEach(addCategoryCard);
  }

  function addItemRow(list, item) {
    var row = fromTemplate("tpl-item");
    row.querySelector(".item-name").value = (item && item.name) || "";
    row.querySelector(".item-price").value = (item && item.price) || "";
    row.querySelector(".item-desc").value = (item && item.description) || "";
    row.querySelector(".remove-btn").addEventListener("click", function () { row.remove(); });
    list.appendChild(row);
  }

  function addCategoryCard(cat) {
    var card = fromTemplate("tpl-category");
    card.setAttribute("data-id", (cat && cat.id) || "");
    card.querySelector(".cat-name").value = (cat && cat.name) || "";
    var itemsList = card.querySelector(".items-list");
    ((cat && cat.items) || []).forEach(function (item) { addItemRow(itemsList, item); });
    card.querySelector(".add-item").addEventListener("click", function () { addItemRow(itemsList, null); });
    card.querySelector(".remove-category").addEventListener("click", function () {
      if (confirm("למחוק את הקטגוריה הזו ואת כל המנות שבה?")) card.remove();
    });
    document.getElementById("menu-editor").appendChild(card);
  }

  document.getElementById("add-category").addEventListener("click", function () {
    addCategoryCard({ id: "", name: "", items: [] });
  });

  function collectMenu() {
    var categories = Array.prototype.map.call(document.querySelectorAll("#menu-editor .category-card"), function (card) {
      var items = Array.prototype.map.call(card.querySelectorAll(".item-editor"), function (row) {
        return {
          name: row.querySelector(".item-name").value.trim(),
          price: row.querySelector(".item-price").value.trim(),
          description: row.querySelector(".item-desc").value.trim(),
        };
      }).filter(function (i) { return i.name; });
      return {
        id: card.getAttribute("data-id") || "",
        name: card.querySelector(".cat-name").value.trim(),
        items: items,
      };
    }).filter(function (c) { return c.name; });
    return { categories: categories };
  }

  document.querySelector('.save-btn[data-save="menu"]').addEventListener("click", function () {
    saveContent("menu", { menu: collectMenu() });
  });

  /* ===== Contact tab ===== */
  function renderContact(content) {
    var c = content.contact;
    document.getElementById("f-address").value = c.address || "";
    document.getElementById("f-address-note").value = c.addressNote || "";
    document.getElementById("f-phone").value = c.phone || "";
    document.getElementById("f-ontopo").value = c.ontopoUrl || "";
    document.getElementById("f-maps").value = c.mapsUrl || "";

    var wrap = document.getElementById("hours-editor");
    wrap.textContent = "";
    (c.hours || []).forEach(addHourRow);
  }

  function addHourRow(row) {
    var el = fromTemplate("tpl-hour-row");
    el.querySelector(".hour-label").value = (row && row.label) || "";
    el.querySelector(".hour-time").value = (row && row.time) || "";
    el.querySelector(".remove-btn").addEventListener("click", function () { el.remove(); });
    document.getElementById("hours-editor").appendChild(el);
  }
  document.getElementById("add-hour-row").addEventListener("click", function () { addHourRow(null); });

  function collectContact() {
    return {
      address: document.getElementById("f-address").value,
      addressNote: document.getElementById("f-address-note").value,
      phone: document.getElementById("f-phone").value,
      ontopoUrl: document.getElementById("f-ontopo").value,
      mapsUrl: document.getElementById("f-maps").value,
      hours: Array.prototype.map.call(document.querySelectorAll("#hours-editor .row-editor--hours"), function (row) {
        return { label: row.querySelector(".hour-label").value.trim(), time: row.querySelector(".hour-time").value.trim() };
      }).filter(function (h) { return h.label; }),
    };
  }

  document.querySelector('.save-btn[data-save="contact"]').addEventListener("click", function () {
    saveContent("contact", { contact: collectContact() });
  });

  /* ===== Footer tab ===== */
  function renderFooter(content) {
    var f = content.footer;
    document.getElementById("f-instagram").value = f.instagramUrl || "";
    document.getElementById("f-facebook").value = f.facebookUrl || "";
    document.getElementById("f-rating").value = f.rating || "";
    document.getElementById("f-review-count").value = f.reviewCount || "";
    document.getElementById("f-price-range").value = f.priceRange || "";
  }

  function collectFooter() {
    return {
      instagramUrl: document.getElementById("f-instagram").value,
      facebookUrl: document.getElementById("f-facebook").value,
      rating: document.getElementById("f-rating").value,
      reviewCount: document.getElementById("f-review-count").value,
      priceRange: document.getElementById("f-price-range").value,
    };
  }

  document.querySelector('.save-btn[data-save="footer"]').addEventListener("click", function () {
    saveContent("footer", { footer: collectFooter() });
  });

  /* ===== Load ===== */
  var EMPTY_CONTENT = {
    hero: { eyebrow: "", title: "", subtitle: "" },
    story: { paragraphs: [] },
    gallery: [],
    menu: { categories: [] },
    contact: { address: "", addressNote: "", phone: "", hours: [], ontopoUrl: "", mapsUrl: "" },
    footer: { instagramUrl: "", facebookUrl: "", rating: "", reviewCount: "", priceRange: "" },
    seo: { title: "", description: "" },
  };

  function setDashboardBusy(isBusy) {
    document.querySelectorAll(".save-btn, .admin-tab").forEach(function (btn) { btn.disabled = isBusy; });
    var loadingNote = document.getElementById("loading-note");
    if (loadingNote) loadingNote.hidden = !isBusy;
  }

  function loadDashboard() {
    showDashboard();
    setDashboardBusy(true);
    fetch("/api/content")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.content = data || EMPTY_CONTENT;
        renderGeneral(state.content);
        renderGallery(state.content);
        renderMenu(state.content);
        renderContact(state.content);
        renderFooter(state.content);
      })
      .catch(function () {
        alert("שגיאה בטעינת התוכן. רעננו את הדף ונסו שוב.");
      })
      .finally(function () {
        setDashboardBusy(false);
      });
  }

  checkSession();
})();
