/* ==========================================
   IURIS HN — LÓGICA DE INTERACCIONES Y DEMO
   ========================================== */

// --- Base de Datos del Simulador (Mock) ---
const mockDatabase = {
    forestal: {
        lawTitle: "Ley Forestal, Áreas Protegidas y Vida Silvestre",
        lawDecreto: "Decreto No. 98-2007",
        articleTitle: "Artículo 45. Clasificación del Uso de Suelos",
        textSnippet: '"Se prohíbe el cambio de uso de suelos en áreas forestales públicas o privadas, salvo proyectos de interés público nacional aprobados por el ICF..."',
        aiAnalysis: "Este artículo establece una restricción absoluta sobre la conversión de uso de suelos forestales para proteger la biodiversidad de Honduras. Toda modificación no autorizada por el ICF en áreas declaradas forestales anula las licencias y configura infracciones de carácter penal ambiental.",
        citation: "HONDURAS. Ley Forestal, Áreas Protegidas y Vida Silvestre, Decreto No. 98-2007. Artículo 45. La Gaceta, 2008.",
        queryText: "Art. 45 Ley Forestal",
        searchSpeed: "Buscando en 0.04s..."
    },
    penal: {
        lawTitle: "Código Penal de la República de Honduras",
        lawDecreto: "Decreto No. 130-2017",
        articleTitle: "Artículo 330. Incendio Forestal",
        textSnippet: '"Quien provoca incendio en bosque público o privado, afectando gravemente los recursos naturales, debe ser castigado con pena de prisión de seis (6) a diez (10) años..."',
        aiAnalysis: "El delito de incendio forestal sanciona con severidad a quienes dañen la cobertura boscosa. La pena se incrementa si se realiza en áreas protegidas o cuencas productoras de agua. IURIS HN permite a los fiscales citar esta relación agravada con la Ley Forestal inmediatamente.",
        citation: "HONDURAS. Código Penal de la República de Honduras, Decreto No. 130-2017. Artículo 330. La Gaceta, 2020.",
        queryText: "Delito de Incendio Forestal Código Penal",
        searchSpeed: "Buscando en 0.06s..."
    },
    ambiente: {
        lawTitle: "Ley General del Ambiente",
        lawDecreto: "Decreto No. 104-93",
        articleTitle: "Artículo 78. Evaluación de Impacto Ambiental (EIA)",
        textSnippet: '"Los proyectos, instalaciones industriales o cualesquiera otras actividades que puedan alterar gravemente el ambiente requerirán previamente una Evaluación de Impacto Ambiental (EIA)..."',
        aiAnalysis: "Establece el carácter preventivo de la gestión ambiental en Honduras. Ningún proyecto industrial u obra civil con potencial contaminante puede iniciar operaciones sin la debida Licencia Ambiental aprobada por la Secretaría de Estado (SERNA/MiAmbiente).",
        citation: "HONDURAS. Ley General del Ambiente, Decreto No. 104-93. Artículo 78. La Gaceta, 1993.",
        queryText: "Evaluacion de Impacto Ambiental Licencia",
        searchSpeed: "Buscando en 0.05s..."
    }
};

let currentQueryKey = 'forestal';
let isTyping = false;

// --- Elementos del DOM ---
const simSearchInput = document.getElementById('simSearchInput');
const simSearchSpeed = document.getElementById('simSearchSpeed');
const resLawTitle = document.getElementById('resLawTitle');
const resLawDecreto = document.getElementById('resLawDecreto');
const resArticleTitle = document.getElementById('resArticleTitle');
const resTextSnippet = document.getElementById('resTextSnippet');
const resAiAnalysis = document.getElementById('resAiAnalysis');

const btnCopyCitation = document.getElementById('btnCopyCitation');
const citationToast = document.getElementById('citationToast');

const btnCopyEmail = document.getElementById('btnCopyEmail');
const copyEmailText = document.getElementById('copyEmailText');
const emailAddress = document.getElementById('emailAddress');

const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');

// --- Menú Móvil Hamburger ---
if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
        navLinks.classList.toggle('show');
        hamburgerBtn.classList.toggle('active');
    });

    // Cerrar menú al hacer clic en un enlace
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('show');
            hamburgerBtn.classList.remove('active');
        });
    });
}

// --- Animación de Escritura (Efecto Tipeado) ---
function typeSearchQuery(text, callback) {
    simSearchInput.value = '';
    isTyping = true;
    let i = 0;
    
    function nextChar() {
        if (i < text.length) {
            simSearchInput.value += text.charAt(i);
            i++;
            setTimeout(nextChar, 40); // Velocidad de tipeo
        } else {
            isTyping = false;
            if (callback) callback();
        }
    }
    nextChar();
}

// --- Ejecutar Búsqueda en el Simulador ---
function runSimulation(key) {
    if (isTyping) return;
    
    currentQueryKey = key;
    const data = mockDatabase[key];
    
    // Ocultar resultados durante el tipeo
    document.getElementById('simResultsContainer').style.opacity = '0.3';
    simSearchSpeed.innerText = "Buscando...";
    
    typeSearchQuery(data.queryText, () => {
        // Simular respuesta del servidor
        setTimeout(() => {
            simSearchSpeed.innerText = data.searchSpeed;
            
            // Actualizar datos
            resLawTitle.innerText = data.lawTitle;
            resLawDecreto.innerText = data.lawDecreto;
            resArticleTitle.innerText = data.articleTitle;
            resTextSnippet.innerText = data.textSnippet;
            resAiAnalysis.innerText = data.aiAnalysis;
            
            // Mostrar resultados con transición
            document.getElementById('simResultsContainer').style.opacity = '1';
        }, 150);
    });
}

// --- Manejo de Botones del Simulador ---
const queryButtons = document.querySelectorAll('.query-btn');
queryButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (isTyping) return;
        
        // Quitar clase activa
        queryButtons.forEach(b => b.classList.remove('active'));
        
        // Agregar clase activa
        const clickedBtn = e.currentTarget;
        clickedBtn.classList.add('active');
        
        // Correr la simulación
        const queryKey = clickedBtn.getAttribute('data-query');
        runSimulation(queryKey);
    });
});

// --- Copiar Cita al Portapapeles ---
if (btnCopyCitation) {
    btnCopyCitation.addEventListener('click', () => {
        const citationText = mockDatabase[currentQueryKey].citation;
        
        navigator.clipboard.writeText(citationText).then(() => {
            // Mostrar Toast
            citationToast.classList.add('show');
            setTimeout(() => {
                citationToast.classList.remove('show');
            }, 2000);
        }).catch(err => {
            console.error('Error al copiar: ', err);
        });
    });
}

// --- Copiar Correo electrónico ---
if (btnCopyEmail && emailAddress) {
    btnCopyEmail.addEventListener('click', () => {
        const email = emailAddress.innerText;
        
        navigator.clipboard.writeText(email).then(() => {
            copyEmailText.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
            btnCopyEmail.style.backgroundColor = '#d4af37';
            btnCopyEmail.style.color = '#000000';
            
            setTimeout(() => {
                copyEmailText.innerText = 'Copiar';
                btnCopyEmail.style.backgroundColor = 'rgba(212,175,55,0.1)';
                btnCopyEmail.style.color = '#d4af37';
            }, 2000);
        }).catch(err => {
            console.error('Error al copiar correo: ', err);
        });
    });
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    // Correr simulación inicial para 'forestal'
    const resultsContainer = document.getElementById('simResultsContainer');
    if (resultsContainer) {
        resultsContainer.style.transition = 'opacity 0.25s ease';
    }
});
