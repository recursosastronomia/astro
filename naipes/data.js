// Datos del usuario. "|" separa el valor de una nota corta.
window.ASTROS = [
 {id:'mercurio',n:'Mercurio',t:'Planeta',m:'0,055',d:'4.879',au:'0,387',rho:'5,43',T:'167',g:'3,7',ve:'15.300',day:'1.407,6',yr:'0,24',vo:'170.500'},
 {id:'venus',n:'Venus',t:'Planeta',m:'0,815',d:'12.104',au:'0,723',rho:'5,24',T:'464',g:'8,87',ve:'37.290',day:'5.832',yr:'0,615',vo:'126.072'},
 {id:'tierra',n:'Tierra',t:'Planeta',m:'1',d:'12.742',au:'1',rho:'5,51',T:'15',g:'9,81',ve:'40.270',day:'24',yr:'1',vo:'107.200'},
 {id:'marte',n:'Marte',t:'Planeta',m:'0,107',d:'6.779',au:'1,524',rho:'3,93',T:'-60',g:'3,71',ve:'18.100',day:'24,6',yr:'1,88',vo:'86.868'},
 {id:'encke',n:'Cometa Encke',sub:'2P/Encke',t:'Cometa',m:'2,2e-12',d:'4,8',au:'2,21|semieje',rho:'0,5',T:'-70|var.',g:'0,0003',ve:'7,2',day:'15',yr:'3,3',vo:'106.000|prom.',fit:'cover'},
 {id:'vesta',n:'4 Vesta',t:'Asteroide',m:'4,35e-5',d:'525',au:'2,36',rho:'3,45',T:'-140',g:'0,25',ve:'1.260',day:'5,34',yr:'3,63',vo:'69.800'},
 {id:'ceres',n:'Ceres',t:'Planeta enano',m:'0,00016',d:'940',au:'2,77',rho:'2,16',T:'-105',g:'0,27',ve:'1.836',day:'9,07',yr:'4,6',vo:'64.400'},
 {id:'pallas',n:'2 Pallas',t:'Asteroide',m:'3,4e-5',d:'512',au:'2,77',rho:'2,89',T:'-110',g:'0,21',ve:'1.152',day:'7,81',yr:'4,62',vo:'64.300'},
 {id:'jupiter',n:'Júpiter',t:'Planeta',m:'317,8',d:'139.820',au:'5,20',rho:'1,33',T:'-110',g:'24,79',ve:'214.200',day:'9,93',yr:'11,86',vo:'47.000',fit:'cover',size:'175%'},
 {id:'saturno',n:'Saturno',t:'Planeta',m:'95,2',d:'116.460',au:'9,58',rho:'0,69',T:'-140',g:'10,44',ve:'129.960',day:'10,7',yr:'29,46',vo:'34.884',fit:'cover'},
 {id:'halley',n:'Cometa Halley',sub:'1P/Halley',t:'Cometa',m:'3,7e-11',d:'11',au:'17,8|semieje',rho:'0,6',T:'-200|var.',g:'0,001',ve:'7,2',day:'52,8',yr:'75,3',vo:'25.000|prom.',fit:'cover'},
 {id:'urano',n:'Urano',t:'Planeta',m:'14,5',d:'50.724',au:'19,22',rho:'1,27',T:'-195',g:'8,69',ve:'76.968',day:'17,2',yr:'84',vo:'24.516'},
 {id:'neptuno',n:'Neptuno',t:'Planeta',m:'17,1',d:'49.244',au:'30,07',rho:'1,64',T:'-200',g:'11,15',ve:'84.816',day:'16,1',yr:'164,8',vo:'19.548',fit:'cover',size:'150%'},
 {id:'pluton',n:'Plutón',t:'Planeta enano',m:'0,0022',d:'2.377',au:'39,48',rho:'1,85',T:'-229',g:'0,62',ve:'4.356',day:'153,3',yr:'248',vo:'17.064'},
 {id:'haumea',n:'Haumea',t:'Planeta enano',m:'0,00067',d:'1.595|medio',au:'43,2',rho:'2,01',T:'-223',g:'0,44',ve:'3.024',day:'3,91',yr:'284',vo:'16.200',fit:'cover',art:1},
 {id:'makemake',n:'Makemake',t:'Planeta enano',m:'0,0005',d:'1.430',au:'45,8',rho:'1,7',T:'-230',g:'0,5',ve:'2.880',day:'22,8',yr:'305',vo:'15.876',art:1},
 {id:'eris',n:'Eris',t:'Planeta enano',m:'0,0028',d:'2.326',au:'67,7',rho:'2,52',T:'-243',g:'0,82',ve:'4.968',day:'25,9',yr:'559',vo:'12.348',fit:'cover',pos:'30% 50%',art:1},
 {id:'gonggong',n:'Gonggong',sub:'2007 OR10',t:'Objeto transneptuniano',m:'0,00029',d:'1.230',au:'67,5',rho:'1,74',T:'-240',g:'0,38',ve:'2.232',day:'22,4',yr:'554',vo:'12.384',art:1},
 {id:'sedna',n:'Sedna',t:'Objeto transneptuniano',m:'0,00017',d:'995',au:'506|semieje',rho:'2,0',T:'-261',g:'0,33',ve:'1.800',day:'10,3',yr:'11.400',vo:'3.744',fit:'cover',pos:'45% 55%',art:1},
 {id:'luna',n:'Luna',t:'Satélite natural',host:'la Tierra',m:'0,0123',d:'3.474',au:'1,00',rho:'3,34',T:'-20',g:'1,62',ve:'8.568',day:'655,7',yr:'1|☉',vo:'107.200|☉',vo2:'3.680'},
 {id:'titan',n:'Titán',t:'Satélite natural',host:'Saturno',m:'0,0225',d:'5.150',au:'9,58',rho:'1,88',T:'-179',g:'1,35',ve:'9.504',day:'382,7',yr:'29,46|☉',vo:'34.884|☉',vo2:'20.052',fit:'cover',size:'130%'},
 {id:'europa',n:'Europa',t:'Satélite natural',host:'Júpiter',m:'0,008',d:'3.122',au:'5,20',rho:'3,01',T:'-170',g:'1,31',ve:'7.290',day:'85,2',yr:'11,86|☉',vo:'47.000|☉',vo2:'49.464',fit:'cover',pos:'50% 50%'},
 {id:'bennu',n:'101955 Bennu',t:'Asteroide',m:'1,2e-14',d:'0,49',au:'1,12',rho:'1,19',T:'-23',g:'0,00001',ve:'0,72',day:'4,3',yr:'1,2',vo:'101.000'},
 {id:'io',n:'Ío',t:'Satélite natural',host:'Júpiter',m:'0,015',d:'3.643',au:'5,20',rho:'3,53',T:'-143',g:'1,79',ve:'9.216',day:'42,5',yr:'11,86|☉',vo:'47.000|☉',vo2:'62.424'},
 {id:'triton',n:'Tritón',t:'Satélite natural',host:'Neptuno',m:'0,0035',d:'2.706',au:'30,07',rho:'2,06',T:'-235',g:'0,78',ve:'5.220',day:'141',yr:'164,8|☉',vo:'19.548|☉',vo2:'15.804'},
 {id:'psyche',n:'16 Psyche',t:'Asteroide',m:'3,8e-6',d:'220',au:'2,92',rho:'3,9',T:'-113',g:'0,14',ve:'648',day:'4,2',yr:'5,0',vo:'62.280',art:1},
 {id:'hygiea',n:'10 Hygiea',t:'Asteroide',m:'1,4e-5',d:'434',au:'3,14',rho:'1,94',T:'-109',g:'0,09',ve:'576',day:'13,8',yr:'5,56',vo:'60.120',fit:'cover',size:'240%',pos:'92% 90%'},
 {id:'halebopp',n:'Cometa Hale-Bopp',sub:'C/1995 O1',t:'Cometa',m:'2,2e-10',d:'60',au:'186|semieje',rho:'0,6',T:'-220|var.',g:'0,005',ve:'36',day:'11,3',yr:'2.530',vo:'7.800|prom.',fit:'cover'},
 {id:'67p',n:'Cometa 67P',sub:'Churyumov-Gerasimenko',t:'Cometa',m:'1,67e-12',d:'4,1',au:'3,46|semieje',rho:'0,53',T:'-70|var.',g:'0,0001',ve:'3,6',day:'12,4',yr:'6,44',vo:'48.600|prom.'},
 {id:'quaoar',n:'Quaoar',t:'Objeto transneptuniano',m:'0,0002',d:'1.110',au:'43,7',rho:'2,0',T:'-230',g:'0,26',ve:'1.800',day:'17,7',yr:'288',vo:'16.200',fit:'cover',art:1}
];

window.STATS = [
 {k:'m',  l:'Masa',              u:'Tierra = 1'},
 {k:'d',  l:'Diámetro',          u:'km'},
 {k:'au', l:'Distancia al Sol',  u:'UA'},
 {k:'rho',l:'Densidad media',    u:'g/cm³'},
 {k:'T',  l:'Temperatura media', u:'°C'},
 {k:'g',  l:'Gravedad',          u:'m/s²'},
 {k:'ve', l:'Vel. de escape',    u:'km/h'},
 {k:'day',l:'Duración del día',  u:'h'},
 {k:'yr', l:'Duración del año',  u:'años'},
 {k:'vo', l:'Vel. orbital',      u:'km/h'}
];

window.TYPES = {
 'Planeta':               {h:65,  code:'PL'},
 'Planeta enano':         {h:305, code:'PE'},
 'Satélite natural':      {h:200, code:'SN'},
 'Asteroide':             {h:140, code:'AS'},
 'Cometa':                {h:245, code:'CO'},
 'Objeto transneptuniano':{h:15,  code:'TN'}
};
