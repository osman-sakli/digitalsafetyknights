// The messages the Arcade's 3D games put in front of a child, in four languages.
// Tricks are grouped by the lever they pull (urgency, secrecy, flattery, fear),
// because each game's end screen names the lever that got through. All-ages:
// nothing here names a photo. Reviewed against the settled TR/ES/FR style rules;
// change wording here, not in a game.
export const LEVERS = ['urgency', 'secrecy', 'flattery', 'fear'];
export const POOLS = {
  "en": {
    "lever": {
      "urgency": "Urgency",
      "secrecy": "Secrecy",
      "flattery": "Flattery",
      "fear": "Fear"
    },
    "rule": {
      "urgency": "A clock is a trick. Real things do not expire in ten seconds.",
      "secrecy": "\"Don't tell\" is the red flag itself.",
      "flattery": "Sudden compliments, then a request. That order is the trick.",
      "fear": "A threat only works in silence. Tell a grown-up."
    },
    "red": {
      "urgency": [
        "FREE ROBUX! Only 10 seconds left!",
        "Click NOW or lose your account!",
        "Last chance! Offer ends in 1 minute!"
      ],
      "secrecy": [
        "Don't tell your parents about this.",
        "This is our little secret, ok?",
        "Delete this chat after reading."
      ],
      "flattery": [
        "You're my favorite! Send me your phone number?",
        "You're special. Let's chat on another app.",
        "I only trust you. What's your address?"
      ],
      "fear": [
        "Give me your skins or I'll get you banned!",
        "Your account is hacked! Send me your password.",
        "Do it or I'll tell everyone your secret."
      ]
    },
    "safe": [
      "Want to play after homework?",
      "Grandma says hi! 👋",
      "Practice is at 5 today.",
      "Nice goal in the match!",
      "Did you finish the math sheet?",
      "Mom: dinner's ready!",
      "Happy birthday!! 🎂",
      "Movie night on Friday?",
      "Good luck on your test!",
      "Can I borrow your notes?",
      "Team photo is tomorrow."
    ]
  },
  "tr": {
    "lever": {
      "urgency": "Acele",
      "secrecy": "Sır",
      "flattery": "İltifat",
      "fear": "Korku"
    },
    "rule": {
      "urgency": "Geri sayım bir tuzaktır. Gerçek şeyler on saniyede bitmez.",
      "secrecy": "“Kimseye söyleme” cümlesi, uyarı işaretinin ta kendisidir.",
      "flattery": "Önce ani iltifat, sonra bir istek. Tuzak bu sıradadır.",
      "fear": "Tehdit yalnızca sessizlikte işe yarar. Bir büyüğe söyle."
    },
    "red": {
      "urgency": [
        "BEDAVA ROBUX! Son 10 saniye!",
        "HEMEN tıkla yoksa hesabın silinir!",
        "Son şans! Teklif 1 dakikada bitiyor!"
      ],
      "secrecy": [
        "Bunu annenle babana söyleme.",
        "Bu aramızda küçük bir sır, tamam mı?",
        "Okuyunca bu sohbeti sil."
      ],
      "flattery": [
        "En sevdiğim sensin! Telefon numaranı atsana?",
        "Sen özelsin. Başka bir uygulamada konuşalım.",
        "Sadece sana güveniyorum. Adresin ne?"
      ],
      "fear": [
        "Skinlerini ver yoksa seni banlatırım!",
        "Hesabın çalındı! Şifreni bana gönder.",
        "Yap, yoksa sırrını herkese söylerim."
      ]
    },
    "safe": [
      "Ödevden sonra oynayalım mı?",
      "Anneannenin selamı var! 👋",
      "Antrenman bugün 5'te.",
      "Maçtaki gol harikaydı!",
      "Matematik ödevini bitirdin mi?",
      "Annen: Yemek hazır!",
      "Doğum günün kutlu olsun!! 🎂",
      "Cuma film gecesi yapalım mı?",
      "Sınavında başarılar!",
      "Notlarını ödünç alabilir miyim?",
      "Takım fotoğrafı yarın."
    ]
  },
  "es": {
    "lever": {
      "urgency": "Urgencia",
      "secrecy": "Secretismo",
      "flattery": "Halagos",
      "fear": "Miedo"
    },
    "rule": {
      "urgency": "Un reloj es una trampa. Lo real no se acaba en diez segundos.",
      "secrecy": "«No le digas a nadie» es la señal de alerta en sí.",
      "flattery": "Halagos de repente y luego un pedido. Ese orden es la trampa.",
      "fear": "Una amenaza solo funciona en silencio. Cuéntaselo a un adulto."
    },
    "red": {
      "urgency": [
        "¡ROBUX GRATIS! ¡Solo quedan 10 segundos!",
        "¡Haz clic YA o pierdes tu cuenta!",
        "¡Última oportunidad! La oferta termina en 1 minuto."
      ],
      "secrecy": [
        "No les cuentes esto a tus papás.",
        "Este es nuestro secretito, ¿ok?",
        "Borra este chat después de leerlo."
      ],
      "flattery": [
        "¡Eres mi persona favorita! ¿Me pasas tu número?",
        "Eres especial. Hablemos en otra app.",
        "Solo confío en ti. ¿Cuál es tu dirección?"
      ],
      "fear": [
        "¡Dame tus skins o hago que te baneen!",
        "¡Hackearon tu cuenta! Mándame tu contraseña.",
        "Hazlo o le cuento tu secreto a todos."
      ]
    },
    "safe": [
      "¿Jugamos después de la tarea?",
      "¡La abuela te manda saludos! 👋",
      "El entrenamiento es hoy a las 5.",
      "¡Golazo en el partido!",
      "¿Terminaste la hoja de mate?",
      "Mamá: ¡la cena está lista!",
      "¡¡Feliz cumpleaños!! 🎂",
      "¿Noche de película el viernes?",
      "¡Suerte en tu examen!",
      "¿Me prestas tus apuntes?",
      "La foto del equipo es mañana."
    ]
  },
  "fr": {
    "lever": {
      "urgency": "Urgence",
      "secrecy": "Secret",
      "flattery": "Flatterie",
      "fear": "Peur"
    },
    "rule": {
      "urgency": "Un compte à rebours est un piège. Le vrai ne disparaît pas en dix secondes.",
      "secrecy": "« Ne dis rien » : le signal d’alerte, c’est cette phrase.",
      "flattery": "Des compliments soudains, puis une demande. Le piège est dans cet ordre.",
      "fear": "Une menace ne marche que dans le silence. Parles-en à un adulte."
    },
    "red": {
      "urgency": [
        "ROBUX GRATUITS ! Plus que 10 secondes !",
        "Clique MAINTENANT ou tu perds ton compte !",
        "Dernière chance ! L’offre finit dans 1 minute !"
      ],
      "secrecy": [
        "Ne dis rien à tes parents.",
        "C’est notre petit secret, d’accord ?",
        "Supprime cette conversation après l’avoir lue."
      ],
      "flattery": [
        "C’est toi que je préfère ! Tu m’envoies ton numéro ?",
        "Tu n’es pas comme les autres. On parle sur une autre appli ?",
        "Je ne fais confiance qu’à toi. C’est quoi ton adresse ?"
      ],
      "fear": [
        "Donne-moi tes skins ou je te fais bannir !",
        "Ton compte est piraté ! Envoie-moi ton mot de passe.",
        "Fais-le ou je dis ton secret à tout le monde."
      ]
    },
    "safe": [
      "On joue après les devoirs ?",
      "Mamie te fait un coucou ! 👋",
      "L’entraînement est à 17 h aujourd’hui.",
      "Super but pendant le match !",
      "Tu as fini la fiche de maths ?",
      "Maman : à table !",
      "Joyeux anniversaire !! 🎂",
      "Soirée film vendredi ?",
      "Bonne chance pour ton contrôle !",
      "Tu me prêtes tes notes ?",
      "La photo d’équipe, c’est demain."
    ]
  }
};
