(function() {
  if (document.getElementById('dsk-search-trigger')) return;

  var ssLang = (window.DSKi18n && DSKi18n.lang) || 'en';
  var ssIsTr = ssLang === 'tr';
  var ssIsEs = ssLang === 'es';

  var INDEX_EN = [
    { title: "Home", url: "/", icon: "🏠", kw: "homepage start hero" },
    { title: "Common Threats", url: "/#threats", icon: "⚠️", kw: "roblox ai chatbots grooming predators messaging apps dangers" },
    { title: "Family Safety Audit", url: "/audit.html", icon: "🛡️", kw: "audit device network app management scored report checklist" },
    { title: "Interactive Quests", url: "/quests.html", icon: "🎮", kw: "roblox pk xd ai threat grooming watch cyber defense digital citizenship badges" },
    { title: "Shieldy's Message Sort (Game)", url: "/game.html", icon: "🕹️", kw: "arcade game sort messages red flag leaderboard play" },
    { title: "Glitch Detector", url: "/glitch-detector.html", icon: "🔍", kw: "paste message screenshot check red flag private" },
    { title: "Chat Simulator", url: "/chat-simulator.html", icon: "💬", kw: "practice conversation branching choices safe risky" },
    { title: "Password Dojo", url: "/password-dojo.html", icon: "🔐", kw: "password strength belt rank test" },
    { title: "Privacy Settings Simulator", url: "/privacy-simulator.html", icon: "⚙️", kw: "mock app privacy settings practice lockdown" },
    { title: "Spot the Deepfake", url: "/spot-the-deepfake.html", icon: "🎭", kw: "quiz ai fake real scenario" },
    { title: "Digital Footprint Calculator", url: "/footprint-calculator.html", icon: "👣", kw: "exposure share profile blur sharpen" },
    { title: "Ask Shieldy", url: "/ask-shieldy.html", icon: "🛡️", kw: "faq questions answers chat mascot" },
    { title: "Build Your Safe Profile", url: "/safe-profile-builder.html", icon: "🗂️", kw: "sort share private items" },
    { title: "Screen-Time Check-In", url: "/screen-time-checkin.html", icon: "📱", kw: "hours mood private local reflection" },
    { title: "Meet the Knights", url: "/knights.html", icon: "⚔️", kw: "shieldy pixel bot dame noble sprout glitch characters cast" },
    { title: "Tactic Almanac", url: "/tactic-almanac.html", icon: "📖", kw: "predator tactics red flags encyclopedia reference" },
    { title: "Shieldy's Journal", url: "/shieldys-journal.html", icon: "🛡️", kw: "kid friendly stories journal" },
    { title: "Knight Chronicles Comic", url: "/knight-chronicles.html", icon: "💥", kw: "comic story chronicles" },
    { title: "Our Origin Story", url: "/origin-story.html", icon: "📖", kw: "founding history mission" },
    { title: "About the Founders", url: "/about.html", icon: "👋", kw: "osman ayse founders team about" },
    { title: "Resource Center", url: "/resources.html", icon: "📚", kw: "everything guides quests tools stories parents kids teens educators" },
    { title: "Snapchat Parent Guide (PDF)", url: "/guides/snapchat-parent-guide.pdf", icon: "👻", kw: "snapchat snap map quick add ghost mode guide download" },
    { title: "Discord Parent Guide (PDF)", url: "/guides/discord-parent-guide.pdf", icon: "💬", kw: "discord privacy servers family center guide download 764" },
    { title: "Roblox Parent Guide (PDF)", url: "/guides/roblox-parent-guide.pdf", icon: "🎮", kw: "roblox privacy chat lockdown guide download" },
    { title: "Safe AI Usage for Kids (PDF)", url: "/guides/safe-ai-usage-guide.pdf", icon: "🤖", kw: "ai tools child safe guide download" },
    { title: "iPhone & Android Safety (PDF)", url: "/guides/iphone-android-safety.pdf", icon: "📱", kw: "screen time app restriction device guide download" },
    { title: "Talk to Your Kids Guide (PDF)", url: "/guides/talk-to-your-kids-guide.pdf", icon: "💬", kw: "conversation scripts age appropriate guide download" },
    { title: "Family Cybersecurity Checklist (PDF)", url: "/guides/family-cybersecurity-checklist.pdf", icon: "🔐", kw: "passwords vpn dns filtering guide download" },
    { title: "Incident Response Guide (PDF)", url: "/guides/incident-response-guide.pdf", icon: "🆘", kw: "what to do something happened guide download" },
    { title: "The Knight's Toolkit (PDF)", url: "/guides/knights-toolkit.pdf", icon: "🖨️", kw: "printable poster sticker sheet bookmarks download" },
    { title: "DSK Monthly Journal", url: "/#journal", icon: "📰", kw: "journal stories threat analysis monthly articles" },
    { title: "Sources & Research", url: "/sources.html", icon: "📊", kw: "sources citations statistics data ncmec fbi ftc research legislation lawsuits" },
    { title: "Legislative Tracker", url: "/legislative-tracker.html", icon: "⚖️", kw: "law legislation kosa kids act take it down app store bill status pending effect" },
    { title: "News Archive", url: "/news-archive.html", icon: "🗞️", kw: "news archive daily headlines press stories sources digital safety watch updates" },
    { title: "Chapters", url: "/chapters.html", icon: "🌍", kw: "chapters local chapter worldwide global start a chapter country volunteer" },
    { title: "Emergency Help & Hotlines", url: "/#emergency", icon: "🆘", kw: "emergency hotline crisis help country region urgent" },
    { title: "Login", url: "/login.html", icon: "🔐", kw: "sign in account" },
    { title: "Dashboard", url: "/dashboard.html", icon: "📊", kw: "my account progress points badges" }
  ];

  var INDEX_TR = [
    { title: "Ana Sayfa", url: "/", icon: "🏠", kw: "anasayfa baslangic hero home" },
    { title: "Yaygın Tehditler", url: "/#threats", icon: "⚠️", kw: "roblox yapay zeka sohbet botlari kandirma tehlike" },
    { title: "Aile Güvenlik Denetimi", url: "/audit.html", icon: "🛡️", kw: "denetim cihaz ag uygulama kontrol listesi audit" },
    { title: "Etkileşimli Görevler", url: "/quests.html", icon: "🎮", kw: "roblox yapay zeka tehdit kandirma siber savunma dijital vatandaslik rozet quest" },
    { title: "Shieldy'nin Mesaj Sınıflandırması (Oyun)", url: "/game.html", icon: "🕹️", kw: "arcade oyun mesaj siniflandir kirmizi bayrak liderlik" },
    { title: "Sahtekarlık Dedektörü", url: "/glitch-detector.html", icon: "🔍", kw: "yapistir mesaj ekran goruntusu kontrol kirmizi bayrak ozel" },
    { title: "Sohbet Simülatörü", url: "/chat-simulator.html", icon: "💬", kw: "pratik konusma dallanma secim guvenli riskli" },
    { title: "Şifre Dojosu", url: "/password-dojo.html", icon: "🔐", kw: "sifre guc kusak rutbe test password" },
    { title: "Gizlilik Ayarları Simülatörü", url: "/privacy-simulator.html", icon: "⚙️", kw: "sahte uygulama gizlilik ayarlari pratik kilit" },
    { title: "Sahte Görüntüyü Yakala", url: "/spot-the-deepfake.html", icon: "🎭", kw: "quiz yapay zeka sahte gercek senaryo deepfake" },
    { title: "Dijital Ayak İzi Hesaplayıcı", url: "/footprint-calculator.html", icon: "👣", kw: "maruziyet paylas profil bulanik netlestir" },
    { title: "Shieldy'ye Sor", url: "/ask-shieldy.html", icon: "🛡️", kw: "sss sorular cevaplar sohbet maskot faq" },
    { title: "Güvenli Profilini Oluştur", url: "/safe-profile-builder.html", icon: "🗂️", kw: "siniflandir paylas ozel esyalar" },
    { title: "Ekran Süresi Kontrolü", url: "/screen-time-checkin.html", icon: "📱", kw: "saat ruh hali ozel yerel yansima" },
    { title: "Şövalyelerle Tanışın", url: "/knights.html", icon: "⚔️", kw: "shieldy pixel bot leydi asil filiz glitch karakterler kadro" },
    { title: "Taktik Ansiklopedisi", url: "/tactic-almanac.html", icon: "📖", kw: "saldirgan taktikleri kirmizi bayraklar ansiklopedi referans" },
    { title: "Shieldy'nin Günlüğü", url: "/shieldys-journal.html", icon: "🛡️", kw: "cocuk dostu hikayeler gunluk journal" },
    { title: "Şövalye Günlükleri Çizgi Romanı", url: "/knight-chronicles.html", icon: "💥", kw: "cizgi roman hikaye chronicles" },
    { title: "Kuruluş Hikayemiz", url: "/origin-story.html", icon: "📖", kw: "kurulus tarih misyon origin" },
    { title: "Kurucular Hakkında", url: "/about.html", icon: "👋", kw: "osman ayse kurucular ekip hakkinda about" },
    { title: "Kaynak Merkezi", url: "/resources.html", icon: "📚", kw: "her sey rehberler gorevler araclar hikayeler ebeveynler cocuklar genclik egitimciler" },
    { title: "Snapchat Ebeveyn Rehberi (PDF)", url: "/guides/snapchat-parent-guide-tr.pdf", icon: "👻", kw: "snapchat snap map quick add hayalet mod rehber indir" },
    { title: "Discord Ebeveyn Rehberi (PDF)", url: "/guides/discord-parent-guide-tr.pdf", icon: "💬", kw: "discord gizlilik sunucu aile merkezi rehber indir 764" },
    { title: "Roblox Ebeveyn Rehberi (PDF)", url: "/guides/roblox-parent-guide-tr.pdf", icon: "🎮", kw: "roblox gizlilik sohbet kilit rehber indir" },
    { title: "Çocuklar için Güvenli Yapay Zeka Kullanımı (PDF)", url: "/guides/safe-ai-usage-guide-tr.pdf", icon: "🤖", kw: "yapay zeka araclari cocuk guvenli rehber indir" },
    { title: "iPhone ve Android Güvenliği (PDF)", url: "/guides/iphone-android-safety-tr.pdf", icon: "📱", kw: "ekran suresi uygulama kisitlama cihaz rehber indir" },
    { title: "Çocuklarınızla Konuşma Rehberi (PDF)", url: "/guides/talk-to-your-kids-guide-tr.pdf", icon: "💬", kw: "konusma metinleri yasa uygun rehber indir" },
    { title: "Aile Siber Güvenlik Kontrol Listesi (PDF)", url: "/guides/family-cybersecurity-checklist-tr.pdf", icon: "🔐", kw: "sifreler vpn dns filtreleme rehber indir" },
    { title: "Olay Müdahale Rehberi (PDF)", url: "/guides/incident-response-guide-tr.pdf", icon: "🆘", kw: "ne yapmali bir sey oldu rehber indir" },
    { title: "Şövalyenin Araç Kutusu (PDF)", url: "/guides/knights-toolkit-tr.pdf", icon: "🖨️", kw: "yazdirilabilir poster cikartma sayfasi yer imi indir" },
    { title: "DSK Aylık Dergi", url: "/#journal", icon: "📰", kw: "dergi hikayeler tehdit analizi aylik makaleler journal" },
    { title: "Kaynaklar & Araştırma", url: "/sources.html", icon: "📊", kw: "kaynaklar istatistik veri ncmec fbi ftc arastirma yasalar davalar" },
    { title: "Yasal Takip", url: "/legislative-tracker.html", icon: "⚖️", kw: "yasa mevzuat kosa kids act take it down uygulama magazasi durum beklemede yururlukte" },
    { title: "Haber Arşivi", url: "/news-archive.html", icon: "🗞️", kw: "haber arsiv gunluk manset basin kaynak dijital guvenlik radari guncelleme" },
    { title: "Şubeler", url: "/chapters.html", icon: "🌍", kw: "sube subeler dunya capinda kuresel sube baslat ulke gonullu" },
    { title: "Acil Yardım ve Hatlar", url: "/#emergency", icon: "🆘", kw: "acil durum yardim hatti kriz ulke bolge" },
    { title: "Giriş", url: "/login.html", icon: "🔐", kw: "giris yap hesap login" },
    { title: "Panel", url: "/dashboard.html", icon: "📊", kw: "hesabim ilerleme puan rozet dashboard" }
  ];

  var INDEX_ES = [
    { title: "Inicio", url: "/", icon: "🏠", kw: "inicio pagina principal hero home" },
    { title: "Amenazas Comunes", url: "/#threats", icon: "⚠️", kw: "roblox ia chatbots acoso depredadores mensajeria apps peligros" },
    { title: "Auditoría de Seguridad Familiar", url: "/audit.html", icon: "🛡️", kw: "auditoria dispositivo red app gestion lista de verificacion" },
    { title: "Misiones Interactivas", url: "/quests.html", icon: "🎮", kw: "roblox ia amenaza acoso defensa cibernetica ciudadania digital insignias quest" },
    { title: "Clasificación de Mensajes de Shieldy (Juego)", url: "/game.html", icon: "🕹️", kw: "arcade juego clasificar mensajes bandera roja marcador" },
    { title: "Detector de Estafas", url: "/glitch-detector.html", icon: "🔍", kw: "pegar mensaje captura de pantalla revisar bandera roja privado" },
    { title: "Simulador de Chat", url: "/chat-simulator.html", icon: "💬", kw: "practica conversacion ramificacion opciones seguro riesgoso" },
    { title: "Dojo de Contraseñas", url: "/password-dojo.html", icon: "🔐", kw: "contraseña fuerza cinturon rango prueba password" },
    { title: "Simulador de Ajustes de Privacidad", url: "/privacy-simulator.html", icon: "⚙️", kw: "app simulada privacidad ajustes practica bloqueo" },
    { title: "Detecta el Deepfake", url: "/spot-the-deepfake.html", icon: "🎭", kw: "quiz ia falso real escenario deepfake" },
    { title: "Calculadora de Huella Digital", url: "/footprint-calculator.html", icon: "👣", kw: "exposicion compartir perfil difuminar enfocar" },
    { title: "Pregúntale a Shieldy", url: "/ask-shieldy.html", icon: "🛡️", kw: "preguntas frecuentes respuestas chat mascota faq" },
    { title: "Crea Tu Perfil Seguro", url: "/safe-profile-builder.html", icon: "🗂️", kw: "clasificar compartir privado articulos" },
    { title: "Chequeo de Tiempo en Pantalla", url: "/screen-time-checkin.html", icon: "📱", kw: "horas animo privado local reflexion" },
    { title: "Conoce a los Caballeros", url: "/knights.html", icon: "⚔️", kw: "shieldy pixel bot dama noble brote glitch personajes elenco" },
    { title: "Almanaque de Tácticas", url: "/tactic-almanac.html", icon: "📖", kw: "tacticas depredador banderas rojas enciclopedia referencia" },
    { title: "El Diario de Shieldy", url: "/shieldys-journal.html", icon: "🛡️", kw: "historias para niños diario journal" },
    { title: "Cómic Crónicas del Caballero", url: "/knight-chronicles.html", icon: "💥", kw: "comic historia chronicles" },
    { title: "Nuestra Historia de Origen", url: "/origin-story.html", icon: "📖", kw: "fundacion historia mision origin" },
    { title: "Sobre los Fundadores", url: "/about.html", icon: "👋", kw: "osman ayse fundadores equipo about" },
    { title: "Centro de Recursos", url: "/resources.html", icon: "📚", kw: "todo guias misiones herramientas historias padres niños adolescentes educadores" },
    { title: "Guía de Snapchat para Padres (PDF)", url: "/guides/snapchat-parent-guide-es.pdf", icon: "👻", kw: "snapchat snap map quick add modo fantasma guia descargar" },
    { title: "Guía de Discord para Padres (PDF)", url: "/guides/discord-parent-guide-es.pdf", icon: "💬", kw: "discord privacidad servidores centro familiar guia descargar 764" },
    { title: "Guía para Padres de Roblox (PDF)", url: "/guides/roblox-parent-guide-es.pdf", icon: "🎮", kw: "roblox privacidad chat bloqueo guia descargar" },
    { title: "Uso Seguro de IA para Niños (PDF)", url: "/guides/safe-ai-usage-guide-es.pdf", icon: "🤖", kw: "herramientas ia niños seguro guia descargar" },
    { title: "Seguridad de iPhone y Android (PDF)", url: "/guides/iphone-android-safety-es.pdf", icon: "📱", kw: "tiempo en pantalla restriccion app dispositivo guia descargar" },
    { title: "Guía para Hablar con Tus Hijos (PDF)", url: "/guides/talk-to-your-kids-guide-es.pdf", icon: "💬", kw: "guiones de conversacion apropiado para la edad guia descargar" },
    { title: "Lista de Verificación de Ciberseguridad Familiar (PDF)", url: "/guides/family-cybersecurity-checklist-es.pdf", icon: "🔐", kw: "contraseñas vpn filtrado dns guia descargar" },
    { title: "Guía de Respuesta a Incidentes (PDF)", url: "/guides/incident-response-guide-es.pdf", icon: "🆘", kw: "que hacer si algo paso guia descargar" },
    { title: "El Kit del Caballero (PDF)", url: "/guides/knights-toolkit-es.pdf", icon: "🖨️", kw: "poster imprimible hoja de pegatinas marcapaginas descargar" },
    { title: "Revista Mensual DSK", url: "/#journal", icon: "📰", kw: "revista historias analisis de amenazas articulos mensuales journal" },
    { title: "Fuentes e Investigación", url: "/sources.html", icon: "📊", kw: "fuentes citas estadisticas datos ncmec fbi ftc investigacion legislacion demandas" },
    { title: "Rastreador Legislativo", url: "/legislative-tracker.html", icon: "⚖️", kw: "ley legislacion kosa kids act take it down tienda de apps estado pendiente vigente" },
    { title: "Archivo de Noticias", url: "/news-archive.html", icon: "🗞️", kw: "noticias archivo diario titulares prensa fuentes vigilancia seguridad digital" },
    { title: "Capítulos", url: "/chapters.html", icon: "🌍", kw: "capitulos capitulo mundial global iniciar un capitulo pais voluntario" },
    { title: "Ayuda de Emergencia y Líneas Directas", url: "/#emergency", icon: "🆘", kw: "emergencia linea directa crisis pais region urgente" },
    { title: "Iniciar Sesión", url: "/login.html", icon: "🔐", kw: "iniciar sesion cuenta login" },
    { title: "Panel", url: "/dashboard.html", icon: "📊", kw: "mi cuenta progreso puntos insignias dashboard" }
  ];

  var INDEX = ssIsTr ? INDEX_TR : ssIsEs ? INDEX_ES : INDEX_EN;
  var SS_PLACEHOLDER = ssIsTr ? "Görev, araç, rehber ara…" : ssIsEs ? "Busca misiones, herramientas, guías…" : "Search quests, tools, guides…";
  var SS_NO_MATCH = ssIsTr ? "Eşleşme yok — farklı bir kelime deneyin." : ssIsEs ? "Sin resultados — prueba otra palabra." : "No matches — try a different word.";
  var SS_ARIA = ssIsTr ? "Siteyi ara" : ssIsEs ? "Buscar en el sitio" : "Search the site";
  var SS_CLOSE_ARIA = ssIsTr ? "Kapat" : ssIsEs ? "Cerrar" : "Close";

  var style = document.createElement('style');
  style.textContent =
    '#dsk-search-trigger { position: fixed; left: 18px; bottom: 18px; z-index: 900; width: 50px; height: 50px; border-radius: 50%; background: var(--navy, #0d1b3e); color: var(--gold2, #e8c56a); border: 2px solid rgba(201,168,76,0.4); font-size: 1.3rem; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; }' +
    '#dsk-search-overlay { position: fixed; inset: 0; background: rgba(6,14,34,0.75); z-index: 9998; display: none; align-items: flex-start; justify-content: center; padding: 8vh 1rem 1rem; }' +
    '#dsk-search-overlay.open { display: flex; }' +
    '#dsk-search-panel { background: white; width: 100%; max-width: 560px; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4); max-height: 76vh; display: flex; flex-direction: column; }' +
    '#dsk-search-input-row { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #eee; flex-shrink: 0; }' +
    '#dsk-search-input-row span.si { font-size: 1.2rem; color: #999; }' +
    '#dsk-search-input { flex: 1; border: none; outline: none; font-size: 1.05rem; font-family: inherit; }' +
    '#dsk-search-close { background: none; border: none; font-size: 1.3rem; color: #999; cursor: pointer; }' +
    '#dsk-search-results { overflow-y: auto; }' +
    '.dsk-sr-item { display: flex; align-items: center; gap: 12px; padding: 12px 18px; text-decoration: none; color: #2d3748; border-bottom: 1px solid #f4f6fb; }' +
    '.dsk-sr-item:hover, .dsk-sr-item.active { background: #f4f6fb; }' +
    '.dsk-sr-icon { font-size: 1.3rem; flex-shrink: 0; }' +
    '.dsk-sr-title { font-weight: 700; font-size: 0.92rem; }' +
    '.dsk-sr-empty { padding: 24px 18px; text-align: center; color: #999; font-size: 0.88rem; }' +
    '@media (max-width: 480px) { #dsk-search-trigger { left: 12px; bottom: 12px; width: 46px; height: 46px; } }';
  document.head.appendChild(style);

  var trigger = document.createElement('button');
  trigger.id = 'dsk-search-trigger';
  trigger.setAttribute('aria-label', SS_ARIA);
  trigger.textContent = '🔍';
  document.body.appendChild(trigger);

  var overlay = document.createElement('div');
  overlay.id = 'dsk-search-overlay';
  overlay.innerHTML =
    '<div id="dsk-search-panel">' +
      '<div id="dsk-search-input-row"><span class="si">🔍</span>' +
      '<input id="dsk-search-input" type="text" placeholder="' + SS_PLACEHOLDER + '" autocomplete="off">' +
      '<button id="dsk-search-close" aria-label="' + SS_CLOSE_ARIA + '">&times;</button></div>' +
      '<div id="dsk-search-results"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = document.getElementById('dsk-search-input');
  var results = document.getElementById('dsk-search-results');

  function render(items) {
    if (!items.length) {
      results.innerHTML = '<div class="dsk-sr-empty">' + SS_NO_MATCH + '</div>';
      return;
    }
    results.innerHTML = items.slice(0, 12).map(function(item) {
      return '<a class="dsk-sr-item" href="' + item.url + '"><span class="dsk-sr-icon">' + item.icon + '</span><span class="dsk-sr-title">' + item.title + '</span></a>';
    }).join('');
  }

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) { render(INDEX.slice(0, 10)); return; }
    var matches = INDEX.filter(function(item) {
      return item.title.toLowerCase().indexOf(q) !== -1 || item.kw.indexOf(q) !== -1;
    });
    render(matches);
  }

  function openSearch() {
    overlay.classList.add('open');
    input.value = '';
    search('');
    setTimeout(function() { input.focus(); }, 50);
  }
  function closeSearch() {
    overlay.classList.remove('open');
  }

  trigger.addEventListener('click', openSearch);
  document.getElementById('dsk-search-close').addEventListener('click', closeSearch);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSearch(); });
  input.addEventListener('input', function() { search(input.value); });

  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeSearch();
    }
  });
})();
