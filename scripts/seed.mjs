// Dados de demonstracao do Entre Aulas, criados pela propria API.
// Uso: node scripts/seed.mjs
// Variaveis: API_URL (padrao http://localhost:3000), MASTER_EMAIL,
// MASTER_PASSWORD e SEED_PASSWORD.
// Se ja houver posts, o script termina sem mudar nada.

const apiUrl = process.env.API_URL ?? 'http://localhost:3000';

for (const name of ['MASTER_EMAIL', 'MASTER_PASSWORD', 'SEED_PASSWORD']) {
  if (!process.env[name]) {
    console.error(`Defina a variavel ${name} antes de rodar o seed.`);
    process.exit(1);
  }
}

const seedPassword = process.env.SEED_PASSWORD;
// Toda conta criada por outra pessoa nasce com senha provisoria e troca
// obrigatoria. O seed faz essa troca, como a pessoa faria no primeiro acesso.
const provisionalPassword = `${seedPassword}-provisoria`;

const people = {
  ana: { name: 'Professora Ana Silva', email: 'ana@escola.com.br' },
  carlos: { name: 'Professor Carlos Lima', email: 'carlos@escola.com.br' },
  beatriz: { name: 'Beatriz Souza', email: 'beatriz@escola.com.br' },
  marina: { name: 'Marina Alves', email: 'marina@escola.com.br' },
  caio: { name: 'Caio Mendes', email: 'caio@escola.com.br' },
  lia: { name: 'Lia Prado', email: 'lia@escola.com.br' },
};

const posts = [
  {
    title: 'Como organizar uma rotina de estudos',
    content:
      'Uma rotina de estudos funciona melhor quando possui horários definidos e metas pequenas. Comece separando as matérias da semana, reserve intervalos e revise o conteúdo ao final de cada dia.',
  },
  {
    title: 'Guia de preparação para a feira de ciências',
    content: [
      'A feira de ciências acontece no fim de abril e as inscrições dos projetos vão até o dia 20 de março. Cada grupo pode ter até quatro integrantes e precisa entregar um resumo de uma página com o tema, a pergunta que pretende responder e os materiais necessários.',
      'Escolham um tema que desperte curiosidade de verdade. Projetos simples e bem executados costumam render mais do que ideias ambiciosas que não cabem no tempo disponível. Um bom caminho é partir de algo do cotidiano: por que o pão cresce, como a água se comporta em diferentes temperaturas ou quais materiais isolam melhor o som.',
      'Depois de definir a pergunta, escrevam uma hipótese e planejem um experimento que possa confirmá-la ou não. Registrem cada etapa em um caderno de bordo, com datas, medidas e observações. Fotografias ajudam bastante na hora de montar o painel.',
      'No dia da apresentação, todos os integrantes devem ser capazes de explicar o projeto. Treinem a fala em casa, preparem respostas para perguntas prováveis e lembrem-se de que a banca valoriza mais o raciocínio do que o resultado final.',
    ].join('\n\n'),
  },
  {
    title: 'Revisão de matemática: função do primeiro grau',
    content:
      'A função do primeiro grau tem a forma f(x) = ax + b. O valor de a indica a inclinação da reta e b mostra onde ela cruza o eixo vertical. Resolva alguns exemplos e confira os resultados no gráfico.',
  },
  {
    title: 'Como escrever uma boa redação dissertativa',
    content: [
      'A redação dissertativa pede que você defenda um ponto de vista sobre um tema, usando argumentos organizados. Antes de escrever, leia a proposta com calma, sublinhe as palavras-chave e anote tudo o que sabe sobre o assunto. Esse rascunho inicial evita que o texto perca o foco no meio do caminho.',
      'A estrutura clássica tem introdução, desenvolvimento e conclusão. Na introdução, apresente o tema e deixe clara a sua tese em uma ou duas frases. No desenvolvimento, dedique um parágrafo a cada argumento, sempre com um exemplo, um dado ou uma explicação que o sustente. Na conclusão, retome a tese e, se a proposta pedir, apresente uma solução possível para o problema.',
      'Cuidado com frases longas demais e com repetições. Prefira períodos curtos, use conectivos para ligar as ideias (portanto, além disso, por outro lado) e revise a concordância e a pontuação ao final. Ler o texto em voz baixa ajuda a perceber trechos confusos.',
      'Na próxima aula faremos uma oficina de redação com o tema "O papel da tecnologia na educação". Tragam o rascunho pronto para que possamos trabalhar a reescrita em duplas.',
    ].join('\n\n'),
  },
  {
    title: 'Frações no dia a dia: exemplos práticos',
    content: [
      'Muitos alunos acham que frações são um assunto distante, mas elas aparecem o tempo todo: na receita que pede meia xícara de açúcar, no relógio que marca um quarto de hora e na pizza dividida entre amigos. Perceber essas situações ajuda a entender o que o numerador e o denominador representam.',
      'Para somar ou subtrair frações, é preciso que os denominadores sejam iguais. Se não forem, encontramos um denominador comum. Por exemplo, 1/2 + 1/4 vira 2/4 + 1/4, que resulta em 3/4. Vale desenhar as partes no caderno até o processo ficar natural.',
      'Na multiplicação, multiplicamos numerador com numerador e denominador com denominador: 2/3 × 3/4 = 6/12, que simplificado é 1/2. Na divisão, invertemos a segunda fração e multiplicamos. Sempre simplifiquem o resultado final.',
      'Deixei uma lista com vinte exercícios no mural da sala. Resolvam pelo menos dez até sexta-feira e anotem as dúvidas para discutirmos juntos.',
    ].join('\n\n'),
  },
  {
    title: 'Revolução Industrial: causas e consequências',
    content: [
      'A Revolução Industrial começou na Inglaterra na segunda metade do século XVIII e transformou a forma como os bens eram produzidos. Até então, a produção era artesanal e feita em pequenas oficinas. Com a máquina a vapor e os teares mecânicos, as fábricas passaram a produzir em grande escala.',
      'Entre as causas, destacam-se o acúmulo de capital vindo do comércio, a disponibilidade de carvão e ferro, o crescimento populacional e os cercamentos dos campos, que empurraram muitas famílias para as cidades em busca de trabalho.',
      'As consequências foram profundas: surgimento da classe operária, jornadas de trabalho longas em condições precárias, crescimento desordenado das cidades e, mais tarde, a organização dos primeiros sindicatos. Ao mesmo tempo, houve avanços nos transportes, com as ferrovias, e na comunicação.',
      'Para a próxima aula, leiam o capítulo 7 do livro didático e tragam uma pergunta sobre o texto. Vamos analisar imagens de fábricas da época e comparar com o mundo do trabalho de hoje.',
    ].join('\n\n'),
  },
  {
    title: 'Fotossíntese: como as plantas produzem energia',
    content: [
      'A fotossíntese é o processo pelo qual plantas, algas e algumas bactérias transformam luz em energia química. Ela acontece principalmente nas folhas, dentro de estruturas chamadas cloroplastos, que contêm a clorofila, o pigmento responsável pela cor verde.',
      'De forma simplificada, a planta absorve gás carbônico do ar pelos estômatos, retira água do solo pelas raízes e, com a energia da luz, produz glicose e libera oxigênio. A equação geral é: gás carbônico + água + luz → glicose + oxigênio.',
      'Esse processo é a base de quase todas as cadeias alimentares e ainda regula a quantidade de oxigênio e de gás carbônico na atmosfera. Por isso, a preservação de florestas e de ambientes aquáticos é tão importante para o equilíbrio do planeta.',
      'No laboratório, vamos observar a produção de bolhas de oxigênio em uma planta aquática exposta à luz. Tragam o roteiro impresso e o jaleco.',
    ].join('\n\n'),
  },
  {
    title: 'Interpretação de texto: estratégias para ler melhor',
    content: [
      'Interpretar um texto não é apenas decodificar palavras: é construir sentido a partir do que está escrito, do que está implícito e do que já sabemos sobre o assunto. Boas estratégias de leitura fazem diferença em todas as disciplinas, não só em português.',
      'Antes de ler, observe o título, o autor, a fonte e as imagens. Faça previsões sobre o conteúdo. Durante a leitura, sublinhe ideias centrais, marque palavras desconhecidas e anote perguntas à margem. Depois, resuma cada parágrafo em uma frase e verifique se as previsões se confirmaram.',
      'Fique atento a pistas como conectivos (mas, porém, portanto), que indicam contraste ou conclusão, e ao ponto de vista do narrador ou do autor. Quando uma questão pedir a ideia principal, procure a frase que resume o parágrafo, geralmente no início ou no fim.',
      'Nesta semana, o exercício será ler uma crônica curta e responder a cinco questões usando essas estratégias. Vamos corrigir juntos na quinta-feira.',
    ].join('\n\n'),
  },
  {
    title: 'Equações do segundo grau passo a passo',
    content: [
      'Uma equação do segundo grau tem a forma ax² + bx + c = 0, com a diferente de zero. Ela pode ter duas raízes reais, uma raiz real ou nenhuma, dependendo do valor do discriminante, representado pela letra grega delta (Δ).',
      'O primeiro passo é identificar os coeficientes a, b e c. Em seguida, calcule Δ = b² − 4ac. Se Δ for positivo, há duas raízes; se for zero, há uma única raiz; se for negativo, não há raízes reais.',
      'Com o delta em mãos, aplique a fórmula de Bhaskara: x = (−b ± √Δ) / 2a. Por exemplo, em x² − 5x + 6 = 0, temos a = 1, b = −5 e c = 6. O delta é 25 − 24 = 1, e as raízes são x = 3 e x = 2. Substitua os valores na equação original para conferir.',
      'Errar sinal é o problema mais comum. Escrevam cada passo em uma linha e não pulem etapas. A lista de exercícios está disponível na secretaria e deve ser entregue até o fim do mês.',
    ].join('\n\n'),
  },
  {
    title: 'Como apresentar um trabalho em grupo com segurança',
    content: [
      'Apresentar um trabalho na frente da turma deixa muita gente nervosa, e isso é normal. A boa notícia é que a segurança vem principalmente da preparação. Um grupo que conhece bem o conteúdo e ensaiou a apresentação transmite confiança mesmo quando a voz treme um pouco.',
      'Dividam o conteúdo de forma equilibrada e definam quem fala em cada momento. Evitem ler os slides: usem tópicos curtos e expliquem com as próprias palavras. Imagens, esquemas e exemplos concretos ajudam a prender a atenção dos colegas.',
      'Ensaiem pelo menos duas vezes cronometrando o tempo. Combinem como fazer a transição entre os integrantes e preparem-se para responder perguntas. Se alguém esquecer uma parte, o restante do grupo pode complementar com naturalidade.',
      'No dia, respirem fundo, olhem para a turma e falem devagar. As apresentações do terceiro bimestre começam na próxima segunda-feira, e a ordem dos grupos está no mural.',
    ].join('\n\n'),
  },
  {
    title: 'Leitura recomendada para esta semana',
    content:
      'Nesta semana vamos ler um conto brasileiro e observar narrador, personagens, tempo e espaço. Anote as passagens que chamarem atenção para conversarmos em sala.',
  },
];

const comments = [
  { post: 0, by: 'beatriz', content: 'Comecei a usar a rotina esta semana e já senti diferença. Obrigada, professora!' },
  { post: 1, by: 'beatriz', content: 'Nosso grupo vai testar quais materiais isolam melhor o som. Pode ser?' },
  { post: 1, by: 'ana', content: 'Pode sim, Beatriz. Lembrem de registrar as medidas no caderno de bordo.' },
  { post: 6, by: 'beatriz', content: 'Precisamos levar o jaleco mesmo? O meu está na lavanderia.' },
  { post: 8, by: 'beatriz', content: 'Ainda erro o sinal do b na fórmula. Vou refazer a lista com calma.' },
];

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.message ?? text;
    throw new Error(`${method} ${path} respondeu ${response.status}: ${detail}`);
  }

  return data;
}

async function signIn(email, password) {
  const { token } = await request('/auth/signin', {
    method: 'POST',
    body: { email, password },
  });
  return token;
}

// Primeiro acesso: entra com a senha provisoria e troca pela definitiva.
async function firstAccess(email) {
  const token = await signIn(email, provisionalPassword);
  await request('/me/password', {
    method: 'PUT',
    token,
    body: { currentPassword: provisionalPassword, newPassword: seedPassword },
  });
  return signIn(email, seedPassword);
}

function account(person, password = provisionalPassword) {
  return { name: person.name, email: person.email, password };
}

const existing = await request('/posts?limit=1');
if (existing.total > 0) {
  console.log('Dados de demonstracao ja existem. Nada foi alterado.');
  process.exit(0);
}

const masterToken = await signIn(
  process.env.MASTER_EMAIL,
  process.env.MASTER_PASSWORD,
);

// Professores: o master cadastra direto, e cada um faz o primeiro acesso.
await request('/teachers', { method: 'POST', token: masterToken, body: account(people.ana) });
const anaToken = await firstAccess(people.ana.email);
await request('/teachers', { method: 'POST', token: masterToken, body: account(people.carlos) });
const carlosToken = await firstAccess(people.carlos.email);

// Posts: os seis primeiros da Ana, os demais do Carlos.
const createdPosts = [];
for (const [index, post] of posts.entries()) {
  const token = index < 6 ? anaToken : carlosToken;
  createdPosts.push(await request('/posts', { method: 'POST', token, body: post }));
}

// Aluna ativa, com comentarios.
await request('/students', { method: 'POST', token: anaToken, body: account(people.beatriz) });
const beatrizToken = await firstAccess(people.beatriz.email);
const tokens = { beatriz: beatrizToken, ana: anaToken };
for (const comment of comments) {
  await request(`/posts/${createdPosts[comment.post].id}/comments`, {
    method: 'POST',
    token: tokens[comment.by],
    body: { content: comment.content },
  });
}

// Convite pendente, feito pela Ana. So o master aceita ou recusa.
await request('/teachers', { method: 'POST', token: anaToken, body: account(people.marina) });

// Aluno excluido, para mostrar a restauracao.
const caio = await request('/students', { method: 'POST', token: anaToken, body: account(people.caio) });
await request(`/students/${caio.id}`, { method: 'DELETE', token: anaToken });

// Aluna que ainda precisa trocar a senha no primeiro acesso.
await request('/students', {
  method: 'POST',
  token: anaToken,
  body: account(people.lia, seedPassword),
});

console.log('Dados de demonstracao prontos.');
