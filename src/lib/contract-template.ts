export type ContractFields = {
  name: string; company: string; document: string; address: string; email: string; phone: string; qualification: string;
  packageName: string; amount: string; items: string; penalty: string;
};

export const EMPTY_CONTRACT: ContractFields = {
  name: "", company: "", document: "", address: "", email: "", phone: "", qualification: "Brasileiro(a)",
  packageName: "Gestão de Redes Sociais", amount: "", items: "", penalty: "",
};

const v = (s: string, ph: string) => (s.trim() ? s.trim() : `[${ph}]`);

export function contractTemplate(f: ContractFields) {
  const pkg = v(f.packageName, "pacote");
  return `CONTRATADA
JC SOLUÇÕES EM TECNOLOGIA E INFORMÁTICA
CPF: 014.300.721-13
Endereço: Rua Cecília Meireles, Vila Irene, Cáceres, MT, 78200-000
Email: marketingdigital28179@gmail.com | Tel: (65) 99625-6092
Representante: Jean Carlo Silva dos Santos

CONTRATANTE
${v(f.name, "nome do contratante")}
Razão Social: ${v(f.company, "razão social")}
CPF/CNPJ: ${v(f.document, "CPF/CNPJ")}
Endereço: ${v(f.address, "endereço")}
Email: ${v(f.email, "e-mail")} | Tel: ${v(f.phone, "telefone")}
${f.qualification.trim()}

OBJETO DO CONTRATO
Pacote: ${pkg} — Valor Total: R$ ${v(f.amount, "valor")}
Itens inclusos: ${v(f.items, "itens inclusos")}

CLÁUSULAS

1. CLÁUSULA DE PROTEÇÃO DE DADOS (LGPD)
As partes se comprometem a cumprir a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), garantindo a proteção dos dados pessoais tratados no âmbito deste contrato.

A CONTRATADA se compromete a:
a) Tratar os dados pessoais apenas para as finalidades previstas neste contrato;
b) Adotar medidas de segurança técnicas e administrativas adequadas para proteção dos dados;
c) Não compartilhar dados pessoais com terceiros sem autorização prévia do CONTRATANTE;
d) Comunicar imediatamente ao CONTRATANTE qualquer incidente de segurança envolvendo dados pessoais;
e) Eliminar os dados pessoais após o término do contrato, salvo obrigação legal de retenção.

O CONTRATANTE é o controlador dos dados e a CONTRATADA atua como operadora, conforme definições da LGPD.

O descumprimento desta cláusula sujeitará a parte infratora às sanções previstas na LGPD, incluindo multas, advertências e responsabilização civil por danos causados aos titulares dos dados.

2. CLÁUSULA PRIMEIRA – DO OBJETO
O presente contrato tem como objeto a prestação de serviços de ${pkg} pelo CONTRATADO ao CONTRATANTE, conforme especificações descritas neste instrumento.

3. CLÁUSULA DE RESPONSABILIDADE E ISENÇÃO DA CONTRATADA
Toda e qualquer responsabilidade decorrente da execução dos serviços ou uso dos produtos objeto deste contrato será exclusivamente do CONTRATANTE (empresa), ficando a CONTRATADA (prestadora de serviço) totalmente isenta de responsabilidade.

A CONTRATADA fica isenta de qualquer responsabilidade jurídica, civil ou criminal decorrente de:
a) Uso indevido dos serviços prestados pelo CONTRATANTE ou por terceiros autorizados pelo mesmo;
b) Decisões tomadas pelo CONTRATANTE com base nos serviços ou informações fornecidas;
c) Danos diretos ou indiretos causados por mau uso, negligência ou imperícia do CONTRATANTE;
d) Resultados obtidos pelo CONTRATANTE com a utilização dos serviços contratados;
e) Violações de leis, regulamentos ou direitos de terceiros praticadas pelo CONTRATANTE;
f) Quaisquer ações judiciais, administrativas ou extrajudiciais movidas contra o CONTRATANTE por terceiros.

O CONTRATANTE se responsabiliza integralmente por:
a) Todas as ações realizadas ou que venham a ser realizadas no escopo deste contrato;
b) A veracidade e exatidão das informações fornecidas à CONTRATADA;
c) O cumprimento de todas as obrigações legais e regulatórias aplicáveis à sua atividade;
d) Quaisquer danos causados a terceiros em decorrência da execução deste contrato;
e) Eventuais custos judiciais, honorários advocatícios e indenizações decorrentes de litígios.

4. CLÁUSULA DE PRESTAÇÃO DE SERVIÇO
A CONTRATADA se obriga a prestar os serviços descritos neste contrato, de acordo com as especificações técnicas acordadas entre as partes.

Os serviços serão executados com diligência e profissionalismo, observando as melhores práticas do mercado.

O prazo para execução dos serviços será conforme estipulado neste contrato, podendo ser prorrogado mediante acordo mútuo entre as partes.

A CONTRATADA poderá utilizar ferramentas, sistemas e metodologias de sua escolha para a execução dos serviços, desde que o resultado final atenda às especificações acordadas.

5. CLÁUSULA DE PAGAMENTO
O pagamento dos serviços e/ou produtos contratados será realizado conforme as seguintes condições:

FORMA DE PAGAMENTO:
O pagamento será efetuado exclusivamente via PIX, na chave informada pela CONTRATADA.

PERIODICIDADE:
a) Para serviços recorrentes: o pagamento será mensal, com vencimento até o dia 5 (cinco) de cada mês subsequente ao da prestação do serviço;
b) Para serviços avulsos ou produtos: o pagamento será realizado por demanda, mediante emissão de fatura/recibo pela CONTRATADA, com prazo de até 5 (cinco) dias úteis para quitação.

ATRASO NO PAGAMENTO:
Em caso de atraso no pagamento, incidirão:
a) Multa de 2% (dois por cento) sobre o valor em atraso;
b) Juros de mora de 1% (um por cento) ao mês, calculados pro rata die;
c) Correção monetária pelo IPCA/IBGE do período.

O atraso superior a 30 (trinta) dias autoriza a CONTRATADA a suspender a prestação dos serviços até a regularização do débito, sem que isso configure inadimplemento contratual por parte da CONTRATADA.

6. CLÁUSULA DE MULTA POR QUEBRA DE CONTRATO E FORO JUDICIAL

DA MULTA POR RESCISÃO ANTECIPADA:
Em caso de rescisão antecipada e imotivada deste contrato por qualquer das partes, a parte que der causa à rescisão deverá pagar à outra parte multa compensatória equivalente a 20% (vinte por cento) do valor total remanescente do contrato, conforme previsto no artigo 413 do Código Civil Brasileiro.

Parágrafo 1º: A multa não se aplica nos casos de rescisão por justa causa, incluindo:
a) Descumprimento de obrigações contratuais por qualquer das partes;
b) Falência, recuperação judicial ou insolvência de qualquer das partes;
c) Caso fortuito ou força maior devidamente comprovados.

DAS CUSTAS JUDICIAIS:
Em caso de litígio judicial decorrente deste contrato:
a) Todas as custas processuais, honorários advocatícios e despesas judiciais serão de responsabilidade exclusiva do CONTRATANTE (empresa);
b) A CONTRATADA (prestadora de serviço) não arcará com quaisquer custos judiciais, mesmo em caso de procedência parcial da ação;
c) O CONTRATANTE se compromete a ressarcir a CONTRATADA de quaisquer despesas decorrentes de ações judiciais movidas por terceiros relacionadas à execução deste contrato.

DO FORO:
Fica eleito o foro da comarca onde se encontra a sede da CONTRATADA para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
O valor da multa rescisória é de R$ ${v(f.penalty, "multa")}.`;
}
