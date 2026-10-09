import { canonicalCategory, categoryKey } from "@/components/vendors/vendor-model";

// Ideas curadas para el botón "✨ Ideas" de cada sección: sugerencias realistas
// para bodas en España que se añaden con un clic. Solo datos y helpers puros.

// ─── Tipos ────────────────────────────────────────────────────────────────

/** Tarea sugerida. `title` empieza por verbo; `when` es un plazo orientativo. */
export interface TaskIdea {
  title: string;
  hint?: string;
  when?: string;
}

/** Partida de presupuesto típica; `share` es un % orientativo del total. */
export interface BudgetIdea {
  category: string;
  share: number;
  concepts: string[];
  hint?: string;
}

/** Tipo de proveedor; `category` reutiliza los nombres de la pestaña Proveedores. */
export interface VendorIdea {
  category: string;
  essential: boolean;
  hint: string;
  whenToBook?: string;
}

/** Momento del cronograma; `typicalOffsetMin` es relativo al inicio de la ceremonia. */
export interface MomentIdea {
  title: string;
  durationMin: number;
  hint?: string;
  typicalOffsetMin?: number;
}

export interface GuestIdeas {
  groups: string[];
  tips: string[];
}

// ─── Tareas por paso ──────────────────────────────────────────────────────
// Sin repetir las tareas por defecto de steps.ts; orden aproximadamente cronológico.

export const STEP_TASK_IDEAS: Record<string, TaskIdea[]> = {
  // Fecha y presupuesto
  fecha_presupuesto: [
    {
      title: "Hablar de qué os importa más en la boda",
      hint: "Decidir prioridades os ayuda a repartir el dinero sin discutir.",
      when: "12–18 meses antes",
    },
    {
      title: "Preguntar con cuánta ayuda familiar contáis",
      hint: "Aclarad pronto si padres o abuelos aportan, y cómo, para ajustar el total.",
      when: "12–18 meses antes",
    },
    {
      title: "Abrir una cuenta conjunta para la boda",
      hint: "Facilita ahorrar, pagar señales y ver los gastos en un solo sitio.",
      when: "12 meses antes",
    },
    {
      title: "Comparar temporada alta y baja",
      hint: "Entre semana o fuera de mayo–septiembre, fincas y catering suelen salir más baratos.",
      when: "12–15 meses antes",
    },
    {
      title: "Consultar fechas con familiares clave",
      hint: "Evitad coincidir con otras bodas, puentes, comuniones o fiestas locales.",
      when: "12–15 meses antes",
    },
    {
      title: "Calcular el coste por invitado",
      hint: "Banquete y finca se multiplican por comensal: probad con 60, 80 y 100.",
      when: "12 meses antes",
    },
    {
      title: "Apuntar los sobres y regalos que esperáis recibir",
      hint: "Una estimación prudente del dinero de invitados ayuda, pero no lo deis por seguro.",
      when: "9–12 meses antes",
    },
    {
      title: "Reservar un colchón del 5–10 % para imprevistos",
      hint: "Siempre surgen extras: pruebas, arreglos, propinas, horas de más.",
      when: "12 meses antes",
    },
    {
      title: "Revisar el presupuesto con lo ya contratado",
      hint: "Cada trimestre, comparad lo previsto con lo pagado y ajustad.",
      when: "Cada 3 meses",
    },
    {
      title: "Pactar quién paga cada cosa y cuándo",
      hint: "Anotad señales y fechas de pago de cada proveedor para no llevaros sustos.",
      when: "6–9 meses antes",
    },
  ],

  // Lista de invitados
  invitados: [
    {
      title: "Definir cuántos invitados queréis como máximo",
      hint: "Fijad un tope realista antes de empezar la lista: condiciona finca y presupuesto.",
      when: "12–15 meses antes",
    },
    {
      title: "Acordar los criterios de invitación",
      hint: "Por ejemplo: gente con la que habéis hablado este año, parejas, niños, compañeros.",
      when: "12–15 meses antes",
    },
    {
      title: "Repartir cupos entre vosotros y las familias",
      hint: "Un reparto claro (por ejemplo, 40/40/20) evita tensiones con padres y suegros.",
      when: "12 meses antes",
    },
    {
      title: "Separar la lista A y la lista B",
      hint: "La B se invita solo si hay bajas; ayuda a ajustar sin agobios.",
      when: "10–12 meses antes",
    },
    {
      title: "Recoger direcciones y teléfonos de todos",
      hint: "Pedid la dirección postal si vais a enviar invitaciones en papel.",
      when: "8–10 meses antes",
    },
    {
      title: "Preguntar por alergias e intolerancias",
      hint: "Lo necesita el catering con antelación: celíacos, alergias, vegetarianos.",
      when: "3–4 meses antes",
    },
    {
      title: "Decidir si se invita a niños y a qué edades",
      hint: "Si hay niños, pensad en menú infantil y una zona o animación para ellos.",
      when: "10–12 meses antes",
    },
    {
      title: "Confirmar asistentes por llamada o mensaje",
      hint: "Perseguid con cariño las respuestas pendientes antes de la fecha límite.",
      when: "2–3 meses antes",
    },
    {
      title: "Pedir confirmación de menú a cada invitado",
      hint: "Si hay opciones de menú, anotadlas en la lista para pasarlas al catering.",
      when: "2–3 meses antes",
    },
    {
      title: "Asignar a cada invitado una mesa",
      hint: "Agrupad por afinidad y repartid las posibles tensiones familiares.",
      when: "3–4 semanas antes",
    },
    {
      title: "Preparar el plano de mesas con el catering",
      hint: "Compartid el plano definitivo y la lista de dietas con el espacio.",
      when: "2–3 semanas antes",
    },
    {
      title: "Avisar a los invitados de bajas de última hora",
      hint: "Si hay cambios, comunicadlo al catering cuanto antes para evitar cobros de más.",
      when: "1–2 semanas antes",
    },
  ],

  // Lugar
  lugar: [
    {
      title: "Hacer una lista corta de fincas y espacios",
      hint: "Buscad por zona, aforo y precio; descartad según vuestra lista de invitados.",
      when: "12–15 meses antes",
    },
    {
      title: "Preguntar fechas libres y precio por invitado",
      hint: "Con un solo correo a varias fincas comparáis disponibilidad y tarifas a la vez.",
      when: "12–15 meses antes",
    },
    {
      title: "Comprobar si el espacio incluye catering propio",
      hint: "Algunas fincas obligan a su catering; otras permiten elegir el vuestro.",
      when: "12–15 meses antes",
    },
    {
      title: "Preguntar por el horario máximo y el límite de ruido",
      hint: "Confirmad hasta qué hora hay música y si la barra libre tiene coste por hora.",
      when: "Al visitar",
    },
    {
      title: "Ver el plan B si llueve",
      hint: "Pedid ver el salón o carpa alternativa y cuánto cuesta montarla.",
      when: "Al visitar",
    },
    {
      title: "Confirmar accesos, parking y accesibilidad",
      hint: "Pensad en personas mayores, sillas de ruedas, tacones y carritos de bebé.",
      when: "Al visitar",
    },
    {
      title: "Preguntar qué mobiliario y decoración incluye",
      hint: "Mesas, sillas, mantelería, vajilla y cristalería: ahorra o encarece mucho.",
      when: "Al visitar",
    },
    {
      title: "Pedir el contrato y revisar la política de cancelación",
      hint: "Leed señal, plazos de pago y qué pasa si cambia el número de invitados.",
      when: "Antes de reservar",
    },
    {
      title: "Preguntar por la hora de acceso para montaje",
      hint: "Proveedores de flores, decoración y música necesitan entrar con tiempo.",
      when: "6–8 meses antes",
    },
    {
      title: "Repasar con el espacio la distribución del salón",
      hint: "Mesas, pista de baile, barra y escenario: dibujadlo con el equipo de la finca.",
      when: "3–4 meses antes",
    },
    {
      title: "Pedir la lista de proveedores recomendados del espacio",
      hint: "Conocen el sitio y suelen tener tarifas cerradas o permisos de acceso ya resueltos.",
      when: "Tras reservar",
    },
    {
      title: "Hacer una última visita técnica con proveedores clave",
      hint: "Con fotógrafo, DJ y decoración repasáis tomas de corriente, luz y espacios.",
      when: "1–2 meses antes",
    },
  ],

  // Proveedores
  proveedores: [
    {
      title: "Hacer una lista de proveedores imprescindibles",
      hint: "Fijad qué es esencial (catering, fotógrafo, música) y qué puede esperar.",
      when: "12 meses antes",
    },
    {
      title: "Pedir presupuesto a 3 fotógrafos o videógrafos",
      hint: "Comparad estilo, horas de cobertura, entregables y plazo de entrega.",
      when: "10–12 meses antes",
    },
    {
      title: "Ver álbumes completos de bodas anteriores",
      hint: "Una boda entera os enseña más que el portafolio de las mejores fotos.",
      when: "10–12 meses antes",
    },
    {
      title: "Reservar peluquería y maquillaje",
      hint: "Incluid prueba previa y preguntad si se desplazan al lugar de la boda.",
      when: "6–9 meses antes",
    },
    {
      title: "Elegir florista y definir estilo floral",
      hint: "Llevad fotos de inspiración y vuestra paleta de colores.",
      when: "6–9 meses antes",
    },
    {
      title: "Encargar la tarta nupcial",
      hint: "Pedid prueba de sabores y preguntad si incluye montaje y entrega.",
      when: "4–6 meses antes",
    },
    {
      title: "Probar el menú con el catering",
      hint: "Escoged entrantes, principales y postre, y revisad el menú infantil y dietas.",
      when: "4–6 meses antes",
    },
    {
      title: "Preguntar por recena y barra libre",
      hint: "Aclarad qué incluye, hasta cuándo y si lleva recargo por hora extra.",
      when: "4–6 meses antes",
    },
    {
      title: "Contratar animación o cuidadores para los niños",
      hint: "Una persona de apoyo libera a los padres y evita sustos durante el banquete.",
      when: "3–6 meses antes",
    },
    {
      title: "Firmar todos los contratos y guardar copias",
      hint: "Revisad servicios, horarios, extras y política de cancelación antes de firmar.",
      when: "Al contratar",
    },
    {
      title: "Anotar fechas de pago y señales de cada proveedor",
      hint: "Metedlas en el calendario para no olvidar ningún pago.",
      when: "Al contratar",
    },
    {
      title: "Dar a cada proveedor el cronograma definitivo",
      hint: "Incluid horas, contactos y direcciones; todos deben saber qué pasa y cuándo.",
      when: "2–3 semanas antes",
    },
    {
      title: "Confirmar por teléfono con cada proveedor",
      hint: "Una llamada la semana anterior evita malentendidos de última hora.",
      when: "1 semana antes",
    },
    {
      title: "Preparar sobres con el pago final de cada proveedor",
      hint: "Etiquetadlos y dejad a una persona de confianza encargada de entregarlos.",
      when: "1 semana antes",
    },
  ],

  // Ceremonia
  ceremonia: [
    {
      title: "Decidir si la ceremonia es en el mismo sitio que el banquete",
      hint: "Ahorra traslados y tiempo; en iglesia o ayuntamiento hay que organizar el traslado.",
      when: "12 meses antes",
    },
    {
      title: "Preguntar por horarios y disponibilidad del lugar",
      hint: "Iglesias, juzgados y ayuntamientos tienen franjas fijas: reservad con antelación.",
      when: "10–12 meses antes",
    },
    {
      title: "Elegir a las personas que os acompañan en la ceremonia",
      hint: "Padrinos, testigos, madrina, pajes y portadores de alianzas.",
      when: "6–9 meses antes",
    },
    {
      title: "Elegir lecturas, poemas o textos para la ceremonia",
      hint: "Pueden leerlos familiares o amigos; avisadles con tiempo para ensayar.",
      when: "3–4 meses antes",
    },
    {
      title: "Escribir los votos",
      hint: "Breves y personales: un minuto cada uno es suficiente y suele emocionar.",
      when: "1–2 meses antes",
    },
    {
      title: "Elegir la música de la entrada, firma y salida",
      hint: "Tres momentos clave: la entrada, el momento de la firma y la salida.",
      when: "3–4 meses antes",
    },
    {
      title: "Preparar un ensayo de la ceremonia",
      hint: "Repasad con oficiante y acompañantes la colocación y el orden de entrada.",
      when: "1–2 semanas antes",
    },
    {
      title: "Decidir cómo colocar a la familia durante la ceremonia",
      hint: "Reservad primeras filas para padres y abuelos; avisadles de dónde sentarse.",
      when: "1 mes antes",
    },
    {
      title: "Comprar o encargar el ramo y las flores de la ceremonia",
      hint: "Incluye ramo, prendidos de familiares y decoración del altar o mesa.",
      when: "3–4 meses antes",
    },
    {
      title: "Preparar el cojín o caja para las alianzas",
      hint: "Alguien de confianza las custodia hasta el momento del intercambio.",
      when: "1 mes antes",
    },
    {
      title: "Imprimir el programa o misal de la ceremonia",
      hint: "Opcional: ayuda a los invitados a seguir lecturas y cantos.",
      when: "1–2 meses antes",
    },
    {
      title: "Preparar el arroz, pétalos o confeti para la salida",
      hint: "Preguntad antes qué permite el lugar; algunos prohíben el arroz.",
      when: "2–4 semanas antes",
    },
  ],

  // Documentos legales (según tipo de ceremonia: civil, religiosa o simbólica)
  documentos_legales: [
    {
      title: "Pedir cita en el Registro Civil o notaría",
      hint: "Para boda civil, pedid cita para el expediente según vuestro municipio.",
      when: "6–8 meses antes",
    },
    {
      title: "Pedir el certificado literal de nacimiento",
      hint: "Se solicita online o en el Registro Civil; suele pedirse reciente.",
      when: "5–6 meses antes",
    },
    {
      title: "Obtener el certificado de empadronamiento",
      hint: "Se pide en el ayuntamiento o por sede electrónica; para ambos si viven distinto.",
      when: "4–5 meses antes",
    },
    {
      title: "Conseguir el certificado de estado civil si hace falta",
      hint: "Necesario si habéis estado casados antes o vivís fuera de España.",
      when: "5–6 meses antes",
    },
    {
      title: "Preparar copias del DNI o pasaporte de ambos",
      hint: "Comprobad que no caduquen antes de la boda ni del viaje.",
      when: "5–6 meses antes",
    },
    {
      title: "Elegir a los testigos del matrimonio",
      hint: "Suelen ser dos (civil); mayores de edad, con DNI en vigor y presentes ese día.",
      when: "3–4 meses antes",
    },
    {
      title: "Pedir la partida de bautismo reciente",
      hint: "Si la ceremonia es religiosa, se solicita en la parroquia donde fuisteis bautizados.",
      when: "5–6 meses antes",
    },
    {
      title: "Hacer el expediente parroquial",
      hint: "Si la ceremonia es religiosa, se tramita en la parroquia, con documentos y entrevista.",
      when: "5–6 meses antes",
    },
    {
      title: "Apuntarse al cursillo prematrimonial",
      hint: "Si es religiosa, suele ser obligatorio; las plazas se llenan: reservad pronto.",
      when: "6–8 meses antes",
    },
    {
      title: "Confirmar con la parroquia o el oficiante la documentación",
      hint: "Cada diócesis y municipio pide algo distinto: confirmad antes de ir a por papeles.",
      when: "6–8 meses antes",
    },
    {
      title: "Preguntar por posibles trámites para ceremonia simbólica",
      hint: "No tiene validez legal por sí sola; decidid si queréis firmar antes en el Registro.",
      when: "6–8 meses antes",
    },
    {
      title: "Decidir el régimen económico matrimonial",
      hint: "Gananciales o separación de bienes; consultadlo con notaría si tenéis dudas.",
      when: "2–4 meses antes",
    },
    {
      title: "Anotar fechas y horas de todas las citas legales",
      hint: "Poned alertas en el calendario: los plazos de validez de certificados son cortos.",
      when: "Al pedir cita",
    },
    {
      title: "Pedir el libro de familia tras la boda",
      hint: "Se tramita en el Registro Civil después del enlace; guardad el certificado.",
      when: "Tras la boda",
    },
    {
      title: "Cambiar domicilio y titulares de contratos si procede",
      hint: "Banco, seguros, hipoteca o alquiler: actualizadlos tras la boda con el libro de familia.",
      when: "Tras la boda",
    },
  ],

  // Vestuario
  vestuario: [
    {
      title: "Guardar fotos de inspiración de looks",
      hint: "Crea una carpeta con estilos, cortes y colores antes de ir a las tiendas.",
      when: "12–14 meses antes",
    },
    {
      title: "Fijar un presupuesto de vestuario",
      hint: "Incluid arreglos, complementos, ropa interior y segundo look si lo hay.",
      when: "12 meses antes",
    },
    {
      title: "Pedir cita en varios talleres o tiendas",
      hint: "Un vestido a medida puede tardar de 6 a 10 meses: pedid cita pronto.",
      when: "10–12 meses antes",
    },
    {
      title: "Elegir zapatos y comprobar que son cómodos",
      hint: "Estrenadlos en casa unos días y llevad un segundo par para bailar.",
      when: "3–4 meses antes",
    },
    {
      title: "Elegir velo, tocado y complementos",
      hint: "Combinadlos con el peinado y el escote; probadlos con el vestido.",
      when: "4–6 meses antes",
    },
    {
      title: "Elegir ropa interior para el vestido",
      hint: "Hay que llevarla a las pruebas para que los ajustes sean correctos.",
      when: "3–4 meses antes",
    },
    {
      title: "Elegir camisa, corbata o pajarita y zapatos del novio",
      hint: "Coordinad colores con el ramo y los acompañantes.",
      when: "3–4 meses antes",
    },
    {
      title: "Decidir el vestuario de pajes, damas y padrinos",
      hint: "Avisadles con tiempo; informadlos del color o estilo que queréis.",
      when: "4–6 meses antes",
    },
    {
      title: "Hacer la prueba final y los últimos arreglos",
      hint: "Ir con los zapatos y complementos definitivos; confirmad cuándo se recoge.",
      when: "3–4 semanas antes",
    },
    {
      title: "Preparar un kit de emergencia para el día",
      hint: "Alfileres, hilo, tiritas, pañuelos, imperdibles, maquillaje y calzado de recambio.",
      when: "1–2 semanas antes",
    },
    {
      title: "Encargar quién cuidará del vestido y del traje",
      hint: "Asignad a alguien para colgarlos, trasladarlos y ayudar con botones o cremallera.",
      when: "1 semana antes",
    },
    {
      title: "Planificar la limpieza y conservación posterior",
      hint: "Llevad el vestido a una tintorería especializada y guardadlo en una funda.",
      when: "Tras la boda",
    },
  ],

  // Papelería
  papeleria: [
    {
      title: "Definir el estilo visual de la boda",
      hint: "Paleta de colores, tipografía y motivos que se repitan en toda la papelería.",
      when: "10–12 meses antes",
    },
    {
      title: "Pedir presupuesto a 3 imprentas",
      hint: "Comparad papel, acabados, cantidad mínima y plazos de entrega.",
      when: "8–10 meses antes",
    },
    {
      title: "Redactar el texto de la invitación",
      hint: "Incluid quién invita, fecha, hora, lugares, vestimenta y fecha límite de respuesta.",
      when: "6–8 meses antes",
    },
    {
      title: "Crear una web o un código QR para la boda",
      hint: "Un enlace con mapas, horarios, alojamiento y lista de regalos ahorra preguntas.",
      when: "6–8 meses antes",
    },
    {
      title: "Imprimir una prueba antes de encargar toda la tirada",
      hint: "Revisad erratas, colores y medidas; el papel real cambia mucho respecto a pantalla.",
      when: "5–6 meses antes",
    },
    {
      title: "Encargar sobres y sellos o lacre",
      hint: "Contad invitaciones extra por si hay errores o invitados de última hora.",
      when: "5–6 meses antes",
    },
    {
      title: "Diseñar el menú, el seating y los marcasitios",
      hint: "Menú, plano de mesas, nombres en mesa: pedidlos cuando la lista esté cerrada.",
      when: "2–3 meses antes",
    },
    {
      title: "Preparar el cartel de bienvenida",
      hint: "Un cartel a la entrada de la finca o del banquete con vuestros nombres.",
      when: "2–3 meses antes",
    },
    {
      title: "Encargar las tarjetas de agradecimiento",
      hint: "Se entregan en la mesa o se envían después a cada invitado.",
      when: "2–3 meses antes",
    },
    {
      title: "Preparar el libro de firmas o de dedicatorias",
      hint: "Una alternativa: tarjetas para dejar un mensaje o una foto instantánea.",
      when: "2–3 meses antes",
    },
    {
      title: "Fijar la fecha límite para confirmar asistencia",
      hint: "Ponedla 4–6 semanas antes de la boda y repetidla en la invitación.",
      when: "3–4 meses antes",
    },
  ],

  // Alojamiento y transporte de invitados
  alojamiento_transporte: [
    {
      title: "Hacer una lista de invitados que vienen de fuera",
      hint: "Sabréis cuántas habitaciones y plazas de transporte necesitáis.",
      when: "8–10 meses antes",
    },
    {
      title: "Pedir un bloqueo de habitaciones en hoteles cercanos",
      hint: "Preguntad tarifa de grupo y fecha límite para liberar plazas sin coste.",
      when: "8–10 meses antes",
    },
    {
      title: "Reservar alojamiento para familia cercana y padrinos",
      hint: "Evita carreras de última hora y facilita los preparativos del día.",
      when: "6–8 meses antes",
    },
    {
      title: "Reservar la suite o habitación de los novios",
      hint: "Para vestiros, descansar y pasar la noche de bodas, si no vais a casa.",
      when: "6–8 meses antes",
    },
    {
      title: "Contratar autobuses o microbuses para invitados",
      hint: "Ida y vuelta entre hotel, ceremonia y finca; ajustad horas al cronograma.",
      when: "4–6 meses antes",
    },
    {
      title: "Reservar el coche de los novios",
      hint: "Un coche clásico o con conductor para la ceremonia o la salida del banquete.",
      when: "4–6 meses antes",
    },
    {
      title: "Dar a los invitados una guía con horarios y rutas",
      hint: "Incluid mapas, aparcamiento, paradas del autobús y teléfonos de taxis locales.",
      when: "2–3 meses antes",
    },
    {
      title: "Hacer una lista de taxis y VTC de la zona",
      hint: "Para quienes no quieran conducir tras la fiesta; apuntad teléfonos de contacto.",
      when: "2–3 meses antes",
    },
    {
      title: "Preparar una bolsa de bienvenida para quienes se alojan",
      hint: "Agua, mapa, aperitivo y programa del fin de semana.",
      when: "1 mes antes",
    },
    {
      title: "Confirmar horarios del autobús con la empresa",
      hint: "Revisad paradas, número de plazas y hora de la vuelta después de la fiesta.",
      when: "1–2 semanas antes",
    },
    {
      title: "Designar a una persona de contacto para el transporte",
      hint: "Alguien de confianza que coordine llegadas, subidas y bajadas durante el día.",
      when: "1–2 semanas antes",
    },
  ],

  // Regalo: en dinero (cuenta o Bizum) o en una lista de cosas
  lista_regalos: [
    {
      title: "Decidir si preferís recibir dinero o una lista de cosas",
      hint: "El dinero es lo más habitual y no genera duplicados; la lista es más tradicional y a mucha gente le resulta más cercana. Podéis cambiar de opinión.",
      when: "6–8 meses antes",
    },
    {
      title: "Decidir si queréis cuenta bancaria, Bizum o las dos",
      hint: "La transferencia vale para todas las edades; el Bizum es rápido para quien tiene la app.",
      when: "6–8 meses antes",
    },
    {
      title: "Repasar qué os falta en casa antes de montar la lista",
      hint: "Recorred cocina, baño y dormitorio con una libreta: lo que se rompe, lo que está viejo y lo que nunca habéis tenido.",
      when: "5–6 meses antes",
    },
    {
      title: "Incluir cosas de distinto precio en la lista",
      hint: "Mezclad detalles pequeños con otros más grandes para que cada persona encuentre algo a su medida.",
      when: "4–5 meses antes",
    },
    {
      title: "Añadir un enlace y un precio aproximado a cada cosa de la lista",
      hint: "Si el invitado lo encuentra en un clic, es más fácil que acierte con el modelo y el color que queréis.",
      when: "4–5 meses antes",
    },
    {
      title: "Marcar las cosas más importantes de la lista",
      hint: "Poned prioridad a lo que necesitáis de verdad (electrodomésticos, ropa de cama) y dejad los caprichos para el final.",
      when: "4–5 meses antes",
    },
    {
      title: "Ir marcando en la lista lo que ya tenéis",
      hint: "Así la invitación solo enseña lo que sigue pendiente y evitáis recibir dos veces lo mismo.",
      when: "Desde que lleguen",
    },
    {
      title: "Pedir a los invitados que os avisen antes de comprar algo de la lista",
      hint: "Una frase en el mensaje basta: «Escribidnos antes de comprar para que no se repita».",
      when: "3–4 meses antes",
    },
    {
      title: "Guardar los tickets de los regalos para poder cambiarlos",
      hint: "Pedid el ticket regalo en la tienda y apuntad quién regaló cada cosa para los agradecimientos.",
      when: "Desde que lleguen",
    },
    {
      title: "Elegir una cuenta que controléis los dos",
      hint: "Puede ser conjunta o una de las vuestras; comprobad que no tiene comisiones por recibir transferencias.",
      when: "6–8 meses antes",
    },
    {
      title: "Decidir para qué queréis destinar el dinero",
      hint: "Luna de miel, entrada de una casa, reformas o un ahorro común: contarlo ayuda a quien regala.",
      when: "6–8 meses antes",
    },
    {
      title: "Redactar un mensaje breve y cariñoso para pedir dinero en vez de regalos",
      hint: "Dos o tres frases, sin presionar: lo importante es que vengan. Mejor en positivo.",
      when: "5–6 meses antes",
    },
    {
      title: "Revisar el IBAN y el Bizum antes de compartirlos",
      hint: "Copiad y pegad en lugar de teclear, y pedid a otra persona que lo compruebe.",
      when: "4–6 meses antes",
    },
    {
      title: "Decidir dónde se verán los datos",
      hint: "En la invitación, en la web de la boda o solo a quien pregunte; elegid qué os resulta más cómodo.",
      when: "4–6 meses antes",
    },
    {
      title: "Preparar una respuesta para quien insista en regalar algo físico",
      hint: "Una frase amable y lista para repetir: «Lo mejor es vuestra compañía; si queréis, aportación para la luna de miel».",
      when: "2–3 meses antes",
    },
    {
      title: "Decidir cómo recoger los sobres y paquetes que lleguen el día de la boda",
      hint: "Una caja o urna discreta y una persona de confianza que la custodie y lo lleve todo a casa.",
      when: "1–2 meses antes",
    },
    {
      title: "Anotar quién ha regalado cuánto",
      hint: "Facilita los agradecimientos y evita olvidos; una nota rápida en el móvil basta.",
      when: "Desde que lleguen",
    },
    {
      title: "Enviar mensajes de agradecimiento personalizados",
      hint: "Una nota breve y sincera a cada persona, mejor en las primeras semanas, contando en qué usaréis el dinero.",
      when: "1–2 meses después",
    },
  ],

  // Cronograma del día
  timeline: [
    {
      title: "Repasar el cronograma con padrinos y testigos",
      hint: "Es más fácil si saben cuándo deben estar y qué se espera de ellos.",
      when: "3–4 semanas antes",
    },
    {
      title: "Dejar margen entre los momentos clave",
      hint: "Los imprevistos pasan; 10–15 minutos de colchón entre momentos ayudan mucho.",
      when: "Al hacer el borrador",
    },
    {
      title: "Acordar con el fotógrafo las fotos imprescindibles",
      hint: "Preparad una lista de fotos de familia con nombres, para ahorrar tiempo.",
      when: "1–2 meses antes",
    },
    {
      title: "Calcular horas de peluquería, maquillaje y vestirse",
      hint: "Contad con tiempo de más: siempre se alarga y las fotos previas requieren hueco.",
      when: "1–2 meses antes",
    },
    {
      title: "Avisar a los invitados de la hora a la que deben llegar",
      hint: "Poned una hora de llegada 20–30 minutos antes de la ceremonia.",
      when: "1 mes antes",
    },
    {
      title: "Planificar las comidas de los novios durante el día",
      hint: "Algo ligero antes de vestirse; después hay poco tiempo para comer con calma.",
      when: "1 mes antes",
    },
    {
      title: "Pasar el cronograma al catering y a la finca",
      hint: "Servicios, horas de cóctel, banquete y recena deben encajar con los tiempos.",
      when: "2–3 semanas antes",
    },
    {
      title: "Asignar un responsable del día para cada tarea",
      hint: "Una persona de confianza se encarga de proveedores, regalos o niños.",
      when: "2–3 semanas antes",
    },
    {
      title: "Imprimir copias del cronograma",
      hint: "Una para cada padrino, el fotógrafo y el responsable de la finca.",
      when: "1 semana antes",
    },
    {
      title: "Preparar la lista de música para cada momento",
      hint: "Entrada, cóctel, banquete, primer baile y fiesta: pasadla al DJ o grupo.",
      when: "1–2 meses antes",
    },
  ],

  // Luna de miel
  luna_de_miel: [
    {
      title: "Decidir cuánto presupuesto dedicáis al viaje",
      hint: "Un tope por persona os ayuda a elegir destino y duración.",
      when: "10–12 meses antes",
    },
    {
      title: "Elegir la época del año adecuada para el destino",
      hint: "Comprobad clima, temporada de lluvias o monzones y precios en esas fechas.",
      when: "8–10 meses antes",
    },
    {
      title: "Decidir qué tipo de viaje queréis hacer",
      hint: "Playa, ciudad, aventura o ruta en coche; ¿descanso o ver mucho?",
      when: "8–10 meses antes",
    },
    {
      title: "Comprobar visados, vacunas y requisitos de entrada",
      hint: "Algunos países piden pasaporte con meses de validez o permisos de entrada.",
      when: "5–6 meses antes",
    },
    {
      title: "Contratar un seguro de viaje",
      hint: "Revisad cancelación y asistencia médica, sobre todo si es un viaje lejos.",
      when: "Al reservar",
    },
    {
      title: "Valorar un viaje de novios posterior en vez de inmediato",
      hint: "Si el trabajo o el presupuesto no cuadra, podéis hacerlo meses después.",
      when: "8–10 meses antes",
    },
    {
      title: "Avisar al hotel de que es un viaje de luna de miel",
      hint: "Muchos hoteles regalan un detalle o mejoran la habitación.",
      when: "1 mes antes",
    },
    {
      title: "Reservar las actividades y restaurantes importantes",
      hint: "Excursiones y cenas especiales se agotan; reservad lo imprescindible.",
      when: "1–3 meses antes",
    },
    {
      title: "Planificar el traslado desde la boda al aeropuerto",
      hint: "Pensad cómo salís de la finca, dónde dejáis el coche y a qué hora es el vuelo.",
      when: "1 mes antes",
    },
    {
      title: "Hacer las maletas la semana antes de la boda",
      hint: "Así no os agobiáis; dejad un rincón con documentación y cargadores.",
      when: "1 semana antes",
    },
    {
      title: "Dejar a alguien encargado de la casa y las mascotas",
      hint: "Plantas, correo, mascotas y llaves: avisad a un familiar o vecino.",
      when: "1–2 semanas antes",
    },
  ],

  // Tareas generales
  tareas_generales: [
    {
      title: "Elegir a una persona de confianza como coordinadora del día",
      hint: "Alguien que no sea novio ni novia y resuelva dudas de proveedores e invitados.",
      when: "2–3 meses antes",
    },
    {
      title: "Hacer una cuenta atrás de tareas por meses",
      hint: "Repartir tareas mes a mes evita acumular todo en las últimas semanas.",
      when: "12 meses antes",
    },
    {
      title: "Comprar las alianzas",
      hint: "Grabad nombres o fecha; el grabado suele tardar unas semanas.",
      when: "4–6 meses antes",
    },
    {
      title: "Preparar los detalles para invitados",
      hint: "Ideas: abanicos, dulces, plantas o una nota; calculad el número exacto.",
      when: "2–3 meses antes",
    },
    {
      title: "Planificar los discursos y quién habla",
      hint: "Avisad a los oradores con tiempo y pedidles que sean breves.",
      when: "1–2 meses antes",
    },
    {
      title: "Preparar un vídeo sorpresa o una presentación de fotos",
      hint: "Pedid fotos a familia y amigos con antelación; conviene que dure pocos minutos.",
      when: "2–3 meses antes",
    },
    {
      title: "Cuidar de vosotros: citas, descanso y deporte",
      hint: "Reservad tiempo para vosotros, sin hablar de la boda ni de listas.",
      when: "Durante todo el proceso",
    },
    {
      title: "Contratar un seguro de bodas",
      hint: "Cubre cancelaciones, daños o fallos de proveedores; comparad coberturas.",
      when: "6–9 meses antes",
    },
    {
      title: "Preparar una bolsa de emergencia para el día",
      hint: "Medicinas, cargadores, calzado de repuesto, tiritas, dinero en efectivo.",
      when: "1 semana antes",
    },
    {
      title: "Preparar una caja de regalo y detalles para los padres",
      hint: "Un gesto de agradecimiento a padres, padrinos y quienes os han ayudado.",
      when: "1 mes antes",
    },
    {
      title: "Planificar quién recoge la decoración al terminar",
      hint: "Flores, carteles, regalos y objetos personales deben volver a casa.",
      when: "1–2 semanas antes",
    },
    {
      title: "Preparar la noche de bodas y la mañana siguiente",
      hint: "Reservad el alojamiento, una maleta y un desayuno tranquilo.",
      when: "1–2 meses antes",
    },
  ],
};

// ─── Presupuesto ──────────────────────────────────────────────────────────
// Reparto orientativo para una boda media en España; suma 100 %.

export const BUDGET_CATEGORY_IDEAS: BudgetIdea[] = [
  {
    category: "Banquete y catering",
    share: 30,
    concepts: [
      "Cóctel de bienvenida",
      "Menú del banquete",
      "Bebidas y vinos",
      "Menú infantil y dietas",
      "Recena",
      "Tarta nupcial",
    ],
    hint: "Suele ser la partida más grande: se multiplica por cada invitado.",
  },
  {
    category: "Finca o espacio",
    share: 14,
    concepts: [
      "Alquiler del espacio",
      "Mobiliario y montaje",
      "Carpa o plan B",
      "Horas extra de uso",
      "Personal de seguridad o limpieza",
    ],
    hint: "Algunas fincas ya incluyen mobiliario y menú; otras cobran aparte.",
  },
  {
    category: "Fotografía y vídeo",
    share: 8,
    concepts: [
      "Reportaje de fotos",
      "Vídeo de la boda",
      "Álbum impreso",
      "Sesión de preboda",
      "Dron o segundo fotógrafo",
    ],
    hint: "Se paga una vez y queda para siempre: no la recortéis demasiado.",
  },
  {
    category: "Música y baile",
    share: 6,
    concepts: [
      "DJ o grupo para la fiesta",
      "Música de la ceremonia",
      "Música del cóctel",
      "Equipo de sonido e iluminación",
      "Barra libre",
    ],
    hint: "Comprobad si la barra libre se paga a parte o va incluida en el catering.",
  },
  {
    category: "Vestuario de la novia",
    share: 5,
    concepts: ["Vestido", "Arreglos y pruebas", "Velo y complementos", "Zapatos", "Ropa interior"],
  },
  {
    category: "Vestuario del novio",
    share: 3,
    concepts: ["Traje", "Camisa y corbata", "Zapatos", "Complementos", "Arreglos"],
  },
  {
    category: "Flores y decoración",
    share: 7,
    concepts: [
      "Ramo de novia",
      "Centros de mesa",
      "Decoración de la ceremonia",
      "Iluminación ambiental",
      "Alquiler de mobiliario decorativo",
    ],
  },
  {
    category: "Papelería",
    share: 3,
    concepts: [
      "Invitaciones",
      "Reserva la fecha",
      "Minutas y plano de mesas",
      "Marcasitios",
      "Gastos de envío",
    ],
  },
  {
    category: "Alianzas",
    share: 2,
    concepts: ["Alianza de ella", "Alianza de él", "Grabado", "Cojín o caja para las alianzas"],
  },
  {
    category: "Belleza",
    share: 2,
    concepts: [
      "Peluquería de la novia",
      "Maquillaje de la novia",
      "Prueba previa",
      "Peluquería de madrina y familiares",
      "Barbería del novio",
    ],
    hint: "Pedid precio con desplazamiento si queréis que vayan al lugar de la boda.",
  },
  {
    category: "Transporte",
    share: 2,
    concepts: [
      "Coche de los novios",
      "Autobuses para invitados",
      "Taxis de vuelta",
      "Aparcamiento o valet",
    ],
  },
  {
    category: "Detalles para invitados",
    share: 3,
    concepts: [
      "Regalo para cada invitado",
      "Kit de chanclas o abanicos",
      "Bolsa de bienvenida",
      "Detalle para padres y padrinos",
      "Fotomatón",
    ],
  },
  {
    category: "Luna de miel",
    share: 8,
    concepts: ["Vuelos", "Alojamiento", "Actividades", "Seguro de viaje", "Comidas y transporte"],
    hint: "Si ya la tenéis ahorrada aparte, podéis repartir este % en otras partidas.",
  },
  {
    category: "Ceremonia y trámites",
    share: 2,
    concepts: [
      "Tasas y certificados",
      "Donativo a la parroquia o al oficiante",
      "Cursillo prematrimonial",
      "Flores del altar",
      "Coro o música en directo",
    ],
  },
  {
    category: "Imprevistos",
    share: 5,
    concepts: ["Extras de última hora", "Propinas", "Horas extra", "Invitados de más"],
    hint: "Reservarlo desde el principio evita sustos al final.",
  },
];

/** Redondea a múltiplos de 10 € (el equilibrio se aplica a la partida mayor). */
function roundTo10(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Reparte `total` según los % orientativos, redondeando cada partida a 10 €.
 * El ajuste de redondeo se aplica a la partida mayor para que la suma
 * coincida con el total redondeado a 10 €.
 */
export function suggestBudget(total: number): { category: string; amount: number }[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  const rows = BUDGET_CATEGORY_IDEAS.map((idea) => ({
    category: idea.category,
    amount: roundTo10((total * idea.share) / 100),
  }));
  const diff = roundTo10(total) - rows.reduce((sum, row) => sum + row.amount, 0);
  if (diff !== 0) {
    let largest = rows[0];
    for (const row of rows) if (row.amount > largest.amount) largest = row;
    largest.amount = Math.max(0, largest.amount + diff);
  }
  return rows;
}

// ─── Proveedores ──────────────────────────────────────────────────────────
// Los nombres de `category` coinciden con los de la pestaña Proveedores
// (Finca, Catering, Fotógrafo, Vídeo, Música, Flores, Pastel, Transporte,
// Decoración); el resto son categorías personalizadas.

export const VENDOR_TYPE_IDEAS: VendorIdea[] = [
  {
    category: "Finca",
    essential: true,
    hint: "Marca fecha, aforo y estilo de la boda. Es lo primero que se reserva.",
    whenToBook: "12–18 meses antes",
  },
  {
    category: "Catering",
    essential: true,
    hint: "Cóctel, banquete, recena y barra libre. Pedid siempre una prueba de menú.",
    whenToBook: "10–14 meses antes",
  },
  {
    category: "Fotógrafo",
    essential: true,
    hint: "Los buenos se agotan pronto. Mirad bodas completas, no solo portafolio.",
    whenToBook: "10–14 meses antes",
  },
  {
    category: "Vídeo",
    essential: false,
    hint: "Un vídeo corto o largometraje; coordinadlo con el fotógrafo para no estorbaros.",
    whenToBook: "9–12 meses antes",
  },
  {
    category: "Música",
    essential: true,
    hint: "DJ o grupo para cóctel y fiesta. Preguntad por equipo, repertorio y horas.",
    whenToBook: "8–12 meses antes",
  },
  {
    category: "Música para la ceremonia",
    essential: false,
    hint: "Coro, violín o cuarteto de cuerda para entrada, firma y salida.",
    whenToBook: "4–6 meses antes",
  },
  {
    category: "Flores",
    essential: false,
    hint: "Ramo, ceremonia y centros de mesa. Mejor flor de temporada para ahorrar.",
    whenToBook: "6–9 meses antes",
  },
  {
    category: "Decoración",
    essential: false,
    hint: "Ambientación, iluminación y mobiliario extra; puede incluirlo la finca.",
    whenToBook: "6–9 meses antes",
  },
  {
    category: "Pastel",
    essential: false,
    hint: "Tarta nupcial o mesa de dulces. Pedid prueba de sabores y entrega en el sitio.",
    whenToBook: "3–6 meses antes",
  },
  {
    category: "Peluquería y maquillaje",
    essential: false,
    hint: "Reservad con prueba previa y confirmad si se desplazan al lugar de la boda.",
    whenToBook: "6–9 meses antes",
  },
  {
    category: "Vestido",
    essential: true,
    hint: "Taller o tienda de novias. Pide cita pronto: a medida tarda de 6 a 10 meses.",
    whenToBook: "10–12 meses antes",
  },
  {
    category: "Traje",
    essential: true,
    hint: "A medida, compra o alquiler. Dejad margen para pruebas y arreglos.",
    whenToBook: "5–8 meses antes",
  },
  {
    category: "Alianzas",
    essential: true,
    hint: "Joyería o taller. El grabado y los ajustes de talla tardan unas semanas.",
    whenToBook: "4–6 meses antes",
  },
  {
    category: "Transporte",
    essential: false,
    hint: "Coche de novios y autobuses para invitados si la finca está lejos.",
    whenToBook: "4–6 meses antes",
  },
  {
    category: "Animación infantil",
    essential: false,
    hint: "Monitores y juegos para los peques: los padres disfrutan más del banquete.",
    whenToBook: "3–6 meses antes",
  },
  {
    category: "Fotomatón",
    essential: false,
    hint: "Divierte a los invitados y deja recuerdo; preguntad por impresiones e props.",
    whenToBook: "4–6 meses antes",
  },
  {
    category: "Wedding planner",
    essential: false,
    hint: "Coordina proveedores y el día de la boda. Útil si vais cortos de tiempo.",
    whenToBook: "12–14 meses antes",
  },
  {
    category: "Invitaciones",
    essential: false,
    hint: "Imprenta o diseñador. Pedid prueba de papel y plazos antes del envío.",
    whenToBook: "8–10 meses antes",
  },
];

/** Normaliza igual que la pestaña Proveedores (sin tildes ni mayúsculas, con alias). */
function vendorKey(category: string): string {
  return categoryKey(canonicalCategory(category));
}

/** Tipos de proveedor que aún no tenéis en vuestra lista. */
export function missingVendorTypes(existingCategories: string[]): VendorIdea[] {
  const have = new Set(existingCategories.map(vendorKey));
  return VENDOR_TYPE_IDEAS.filter((idea) => !have.has(vendorKey(idea.category)));
}

// ─── Cronograma ───────────────────────────────────────────────────────────
// `typicalOffsetMin` es relativo al inicio de la ceremonia (0 = empieza).

export const TIMELINE_MOMENT_IDEAS: MomentIdea[] = [
  {
    title: "Preparativos y vestirse",
    durationMin: 150,
    hint: "Peluquería, maquillaje y fotos de los preparativos.",
    typicalOffsetMin: -210,
  },
  {
    title: "Fotos de pareja antes de la ceremonia",
    durationMin: 30,
    hint: "Opción «first look»: os veis antes y os relajáis.",
    typicalOffsetMin: -60,
  },
  {
    title: "Llegada de invitados",
    durationMin: 30,
    hint: "Música suave, agua o abanicos mientras se sientan.",
    typicalOffsetMin: -30,
  },
  {
    title: "Entrada del novio",
    durationMin: 5,
    hint: "Suele ir acompañado de su madre o de la madrina.",
    typicalOffsetMin: -5,
  },
  {
    title: "Entrada de la novia",
    durationMin: 5,
    hint: "Con la música elegida y acompañada por su padre o una persona especial.",
    typicalOffsetMin: 0,
  },
  {
    title: "Lecturas",
    durationMin: 10,
    hint: "Dos o tres lecturas breves de familiares o amigos.",
    typicalOffsetMin: 10,
  },
  {
    title: "Lectura de votos",
    durationMin: 10,
    hint: "Un minuto cada uno, mejor escritos en papel por si hay nervios.",
    typicalOffsetMin: 20,
  },
  {
    title: "Intercambio de alianzas",
    durationMin: 5,
    hint: "El portador de las alianzas las entrega en este momento.",
    typicalOffsetMin: 30,
  },
  {
    title: "Firma del acta",
    durationMin: 10,
    hint: "Con testigos y música de fondo; buen momento para una foto.",
    typicalOffsetMin: 35,
  },
  {
    title: "Salida con arroz o pétalos",
    durationMin: 10,
    hint: "Comprobad antes que el lugar lo permite.",
    typicalOffsetMin: 45,
  },
  {
    title: "Fotos de familia",
    durationMin: 30,
    hint: "Llevad una lista de grupos con nombres para que sea rápido.",
    typicalOffsetMin: 55,
  },
  {
    title: "Cóctel de bienvenida",
    durationMin: 90,
    hint: "Mientras los novios hacen sus fotos, los invitados disfrutan del aperitivo.",
    typicalOffsetMin: 60,
  },
  {
    title: "Fotos de pareja",
    durationMin: 30,
    hint: "Aprovechad la luz de la tarde; el cóctel os cubre sin que echen de menos.",
    typicalOffsetMin: 75,
  },
  {
    title: "Entrada al banquete",
    durationMin: 10,
    hint: "Entrada de los novios con su canción favorita.",
    typicalOffsetMin: 150,
  },
  {
    title: "Banquete y discursos",
    durationMin: 120,
    hint: "Hablad entre platos para no enfriar la comida; pedid brevedad.",
    typicalOffsetMin: 160,
  },
  {
    title: "Vídeo sorpresa",
    durationMin: 5,
    hint: "Comprobad proyector y sonido antes; mejor entre plato y postre.",
    typicalOffsetMin: 220,
  },
  {
    title: "Corte de la tarta",
    durationMin: 15,
    hint: "Hacedlo con foto y brindis; luego se reparte con el café.",
    typicalOffsetMin: 280,
  },
  {
    title: "Entrega de detalles",
    durationMin: 15,
    hint: "Los novios pasan por mesas o los dejan en cada sitio con una nota.",
    typicalOffsetMin: 290,
  },
  {
    title: "Lanzamiento del ramo",
    durationMin: 10,
    hint: "Opcional; a veces se cambia por un ramo para la madrina o la abuela.",
    typicalOffsetMin: 300,
  },
  {
    title: "Primer baile",
    durationMin: 5,
    hint: "Ensayad un poco y avisad al DJ de la canción y del momento.",
    typicalOffsetMin: 310,
  },
  {
    title: "Apertura de barra libre",
    durationMin: 180,
    hint: "Confirmad hora de inicio y fin con el catering.",
    typicalOffsetMin: 320,
  },
  {
    title: "Recena",
    durationMin: 30,
    hint: "Bocadillos, mini hamburguesas, croquetas o chocolate con churros.",
    typicalOffsetMin: 480,
  },
  {
    title: "Fin de fiesta",
    durationMin: 15,
    hint: "Última canción y despedida; acordad la hora exacta con la finca.",
    typicalOffsetMin: 560,
  },
  {
    title: "Autobús de vuelta",
    durationMin: 30,
    hint: "Avisad a los invitados de las horas y paradas para volver.",
    typicalOffsetMin: 570,
  },
];

// ─── Invitados ────────────────────────────────────────────────────────────

export const GUEST_IDEAS: GuestIdeas = {
  groups: [
    "Familia de la novia",
    "Familia del novio",
    "Padres y abuelos",
    "Tíos y primos",
    "Amigos de la infancia",
    "Amigos del cole",
    "Amigos de la universidad",
    "Amigos de la pareja",
    "Trabajo",
    "Vecinos y amigos de la familia",
    "Niños",
  ],
  tips: [
    "Empezad por la lista de «imprescindibles» y añadid después, con calma.",
    "Poned un tope y un criterio claro, para no tener que dar explicaciones.",
    "Contad las parejas y los acompañantes desde el principio.",
    "Pedid ya las alergias, intolerancias y menús especiales.",
    "Tened una lista B por si hay bajas, pero invitad a todos a la vez.",
  ],
};
