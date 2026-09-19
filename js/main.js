(function () {
  "use strict";

  var header = document.getElementById("site-header");
  var navToggle = document.getElementById("nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  var yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Header shadow on scroll */
  function onScroll() {
    if (window.scrollY > 8) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile nav toggle */
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      mobileNav.hidden = isOpen;
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        mobileNav.hidden = true;
      });
    });
  }

  /* Active nav link on scroll */
  var sections = document.querySelectorAll("main section[id]");
  var navLinks = document.querySelectorAll(".main-nav a, .mobile-nav a");

  function setActiveLink(id) {
    navLinks.forEach(function (link) {
      var match = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", match);
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) { navObserver.observe(section); });
  }

  /* Scroll reveal (shared observer, usable for static + dynamically-rendered content) */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealObserver = null;
  if ("IntersectionObserver" in window && !reduceMotion) {
    revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
  }
  function observeReveal(el) {
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add("is-visible");
  }
  document.querySelectorAll(".reveal").forEach(observeReveal);

  /* Menu tabs (bound fresh after each render, since categories are dynamic) */
  function bindMenuTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".menu-tab"));
    var panels = Array.prototype.slice.call(document.querySelectorAll(".menu-panel"));

    function activateTab(tab) {
      tabs.forEach(function (t) {
        var isSelected = t === tab;
        t.setAttribute("aria-selected", String(isSelected));
        t.tabIndex = isSelected ? 0 : -1;
        t.classList.toggle("is-active", isSelected);
      });
      panels.forEach(function (panel) {
        var match = panel.id === tab.getAttribute("aria-controls");
        panel.hidden = !match;
        panel.classList.toggle("is-active", match);
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { activateTab(tab); });
      tab.addEventListener("keydown", function (e) {
        var newIndex = null;
        if (e.key === "ArrowLeft") newIndex = (index + 1) % tabs.length;
        else if (e.key === "ArrowRight") newIndex = (index - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") newIndex = 0;
        else if (e.key === "End") newIndex = tabs.length - 1;
        if (newIndex !== null) {
          e.preventDefault();
          tabs[newIndex].focus();
          activateTab(tabs[newIndex]);
        }
      });
    });
  }

  /* Lightbox */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var galleryGrid = document.getElementById("gallery-grid");
  var lastFocused = null;

  function openLightbox(src, alt) {
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.hidden = false;
    lightboxClose.focus();
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  if (galleryGrid) {
    galleryGrid.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-full]");
      if (!btn) return;
      var img = btn.querySelector("img");
      openLightbox(btn.getAttribute("data-full"), img ? img.alt : "");
    });
  }

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
  });

  /* ===== Content loading & rendering ===== */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function toTelHref(phone) {
    var digits = (phone || "").replace(/[^\d+]/g, "");
    if (digits.startsWith("0")) digits = "+972" + digits.slice(1);
    return "tel:" + digits;
  }

  function renderHero(hero) {
    if (!hero) return;
    var eyebrow = document.getElementById("hero-eyebrow");
    var title = document.getElementById("hero-title");
    var subtitle = document.getElementById("hero-subtitle");
    if (eyebrow) eyebrow.textContent = hero.eyebrow || "";
    if (title) {
      title.textContent = "";
      String(hero.title || "").split("\n").forEach(function (line, i) {
        if (i > 0) title.appendChild(document.createElement("br"));
        title.appendChild(document.createTextNode(line));
      });
    }
    if (subtitle) subtitle.textContent = hero.subtitle || "";
  }

  function renderStory(story) {
    var wrap = document.getElementById("story-paragraphs");
    if (!wrap || !story) return;
    wrap.textContent = "";
    (story.paragraphs || []).forEach(function (text, i) {
      wrap.appendChild(el("p", i === 0 ? "lede" : null, text));
    });
  }

  function renderGallery(gallery) {
    var grid = document.getElementById("gallery-grid");
    if (!grid || !gallery) return;
    grid.textContent = "";
    gallery.forEach(function (g, i) {
      var li = el("li", "gallery-item reveal" + (i === 0 ? " gallery-item--wide" : ""));
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-full", g.url);
      btn.setAttribute("aria-label", "הגדלת תמונה" + (g.alt ? ": " + g.alt : ""));
      var img = document.createElement("img");
      img.src = g.url;
      img.alt = g.alt || "";
      img.loading = "lazy";
      btn.appendChild(img);
      li.appendChild(btn);
      grid.appendChild(li);
      observeReveal(li);
    });
  }

  function buildMenuItemRow(item) {
    var li = el("li", "menu-item");
    var np = el("div", "name-price");
    np.appendChild(el("span", "name", item.name));
    var leader = document.createElement("span");
    leader.className = "leader";
    leader.setAttribute("aria-hidden", "true");
    np.appendChild(leader);
    np.appendChild(el("span", "price", item.price || ""));
    li.appendChild(np);
    if (item.description) li.appendChild(el("p", "desc", item.description));
    return li;
  }

  function buildCocktailRow(item) {
    var li = el("li", "menu-item");
    li.appendChild(el("span", "name", item.name));
    if (item.description) li.appendChild(el("p", "desc", item.description));
    return li;
  }

  function renderMenu(menu) {
    var tabsWrap = document.getElementById("menu-tabs");
    var panelsWrap = document.getElementById("menu-panels");
    if (!tabsWrap || !panelsWrap || !menu) return;
    tabsWrap.textContent = "";
    panelsWrap.textContent = "";

    var categories = menu.categories || [];
    categories.forEach(function (cat, index) {
      var isActive = index === 0;

      var tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.id = "tab-" + cat.id;
      tab.setAttribute("aria-controls", "panel-" + cat.id);
      tab.setAttribute("aria-selected", String(isActive));
      tab.className = "menu-tab" + (isActive ? " is-active" : "");
      tab.tabIndex = isActive ? 0 : -1;
      tab.textContent = cat.name;
      tabsWrap.appendChild(tab);

      var items = cat.items || [];
      var hasDesc = items.some(function (i) { return i.description; });
      var hasPrice = items.some(function (i) { return i.price; });
      var isCocktailStyle = hasDesc && !hasPrice;
      var isCompact = !hasDesc;
      var isCols = isCompact && items.length > 10;

      var panel = document.createElement("div");
      panel.setAttribute("role", "tabpanel");
      panel.id = "panel-" + cat.id;
      panel.setAttribute("aria-labelledby", tab.id);
      panel.className = "menu-panel" + (isActive ? " is-active" : "");
      panel.hidden = !isActive;

      var listClass = "menu-list";
      if (isCocktailStyle) listClass += " menu-list--cocktails";
      if (isCompact) listClass += " menu-list--compact";
      if (isCols) listClass += " menu-list--cols";
      var list = el("ul", listClass);
      items.forEach(function (item) {
        list.appendChild(isCocktailStyle ? buildCocktailRow(item) : buildMenuItemRow(item));
      });
      panel.appendChild(list);
      panelsWrap.appendChild(panel);
    });

    bindMenuTabs();
  }

  function renderContact(contact) {
    if (!contact) return;
    var address = document.getElementById("contact-address");
    var addressNote = document.getElementById("contact-address-note");
    var phone = document.getElementById("contact-phone");
    var hours = document.getElementById("contact-hours");
    var mapsLink = document.getElementById("maps-link");

    if (address) address.textContent = contact.address || "";
    if (addressNote) addressNote.textContent = contact.addressNote || "";
    if (phone) {
      phone.textContent = contact.phone || "";
      phone.href = toTelHref(contact.phone);
    }
    if (hours) {
      hours.textContent = "";
      (contact.hours || []).forEach(function (row) {
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.scope = "row";
        th.textContent = row.label;
        var td = document.createElement("td");
        td.textContent = row.time;
        if ((row.time || "").indexOf("סגור") !== -1) td.className = "closed";
        tr.appendChild(th);
        tr.appendChild(td);
        hours.appendChild(tr);
      });
    }
    if (mapsLink && contact.mapsUrl) mapsLink.href = contact.mapsUrl;
    if (contact.ontopoUrl) {
      document.querySelectorAll(".js-ontopo-link").forEach(function (a) {
        a.href = contact.ontopoUrl;
      });
    }
  }

  function renderFooter(footer, contact) {
    var address = document.getElementById("footer-address");
    var phone = document.getElementById("footer-phone");
    var ig = document.getElementById("footer-instagram");
    var fb = document.getElementById("footer-facebook");
    var rating = document.getElementById("footer-rating");
    var price = document.getElementById("footer-price");

    if (address && contact) {
      address.textContent = "";
      String(contact.address || "").split(" — ").forEach(function (line, i) {
        if (i > 0) address.appendChild(document.createElement("br"));
        address.appendChild(document.createTextNode(line));
      });
    }
    if (phone && contact) {
      phone.textContent = contact.phone || "";
      phone.href = toTelHref(contact.phone);
    }
    if (!footer) return;
    if (ig && footer.instagramUrl) ig.href = footer.instagramUrl;
    if (fb && footer.facebookUrl) fb.href = footer.facebookUrl;
    if (rating) rating.textContent = [footer.rating, footer.reviewCount ? footer.reviewCount + " ביקורות בגוגל" : ""].filter(Boolean).join(" · ");
    if (price) price.textContent = footer.priceRange || "";
  }

  function renderSeo(seo) {
    if (!seo) return;
    if (seo.title) document.title = seo.title;
    if (seo.description) {
      var meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", seo.description);
    }
  }

  function loadContent() {
    fetch("/api/content")
      .then(function (r) { return r.json(); })
      .then(function (content) {
        if (!content) return;
        renderHero(content.hero);
        renderStory(content.story);
        renderGallery(content.gallery);
        renderMenu(content.menu);
        renderContact(content.contact);
        renderFooter(content.footer, content.contact);
        renderSeo(content.seo);
      })
      .catch(function () {
        /* content stays empty in the unlikely event the API is unreachable */
      });
  }

  loadContent();
})();
