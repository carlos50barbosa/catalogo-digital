// Biblioteca compartilhada (CatalogItem): ~90 produtos típicos de mercadinho
// brasileiro. As IMAGENS REAIS serão adicionadas depois — no seed usamos um
// placeholder padrão (ver PLACEHOLDER_IMAGE em prisma/seed.ts).

export type SeedCatalogItem = {
  name: string
  brand?: string
  suggestedCategory: string
  /** Dica de unidade usada apenas ao montar produtos de demonstração. */
  unit?: 'UN' | 'KG' | 'L' | 'PCT'
}

export const CATALOG_ITEMS: SeedCatalogItem[] = [
  // ---------- Bebidas ----------
  { name: 'Refrigerante Cola 2L', brand: 'Coca-Cola', suggestedCategory: 'Bebidas' },
  { name: 'Refrigerante Guaraná 2L', brand: 'Antarctica', suggestedCategory: 'Bebidas' },
  { name: 'Refrigerante Laranja 2L', brand: 'Fanta', suggestedCategory: 'Bebidas' },
  { name: 'Refrigerante Limão 2L', brand: 'Sprite', suggestedCategory: 'Bebidas' },
  { name: 'Refrigerante Cola Lata 350ml', brand: 'Coca-Cola', suggestedCategory: 'Bebidas' },
  { name: 'Água Mineral sem Gás 1,5L', brand: 'Indaiá', suggestedCategory: 'Bebidas' },
  { name: 'Água Mineral sem Gás 500ml', brand: 'Crystal', suggestedCategory: 'Bebidas' },
  { name: 'Água Mineral com Gás 500ml', brand: 'Crystal', suggestedCategory: 'Bebidas' },
  { name: 'Suco de Uva Integral 1L', brand: 'Aurora', suggestedCategory: 'Bebidas' },
  { name: 'Suco de Laranja 1L', brand: 'Del Valle', suggestedCategory: 'Bebidas' },
  { name: 'Néctar de Pêssego 1L', brand: 'Maguary', suggestedCategory: 'Bebidas' },
  { name: 'Cerveja Pilsen Lata 350ml', brand: 'Skol', suggestedCategory: 'Bebidas' },
  { name: 'Cerveja Pilsen Lata 350ml', brand: 'Brahma', suggestedCategory: 'Bebidas' },
  { name: 'Energético 250ml', brand: 'Red Bull', suggestedCategory: 'Bebidas' },
  { name: 'Isotônico 500ml', brand: 'Gatorade', suggestedCategory: 'Bebidas' },
  { name: 'Chá Gelado Limão 1,5L', brand: 'Lipton', suggestedCategory: 'Bebidas' },

  // ---------- Mercearia ----------
  { name: 'Arroz Branco Tipo 1 5kg', brand: 'Tio João', suggestedCategory: 'Mercearia' },
  { name: 'Arroz Branco Tipo 1 1kg', brand: 'Camil', suggestedCategory: 'Mercearia' },
  { name: 'Feijão Carioca 1kg', brand: 'Camil', suggestedCategory: 'Mercearia' },
  { name: 'Feijão Preto 1kg', brand: 'Kicaldo', suggestedCategory: 'Mercearia' },
  { name: 'Açúcar Refinado 1kg', brand: 'União', suggestedCategory: 'Mercearia' },
  { name: 'Açúcar Cristal 5kg', brand: 'União', suggestedCategory: 'Mercearia' },
  { name: 'Café Torrado e Moído 500g', brand: 'Pilão', suggestedCategory: 'Mercearia' },
  { name: 'Café Torrado e Moído 250g', brand: '3 Corações', suggestedCategory: 'Mercearia' },
  { name: 'Óleo de Soja 900ml', brand: 'Soya', suggestedCategory: 'Mercearia' },
  { name: 'Azeite de Oliva Extra Virgem 500ml', brand: 'Gallo', suggestedCategory: 'Mercearia' },
  { name: 'Sal Refinado 1kg', brand: 'Cisne', suggestedCategory: 'Mercearia' },
  { name: 'Macarrão Espaguete 500g', brand: 'Renata', suggestedCategory: 'Mercearia' },
  { name: 'Macarrão Parafuso 500g', brand: 'Galo', suggestedCategory: 'Mercearia' },
  { name: 'Farinha de Trigo 1kg', brand: 'Dona Benta', suggestedCategory: 'Mercearia' },
  { name: 'Farinha de Mandioca 1kg', brand: 'Yoki', suggestedCategory: 'Mercearia' },
  { name: 'Fubá Mimoso 1kg', brand: 'Yoki', suggestedCategory: 'Mercearia' },
  { name: 'Molho de Tomate 340g', brand: 'Quero', suggestedCategory: 'Mercearia' },
  { name: 'Extrato de Tomate 130g', brand: 'Elefante', suggestedCategory: 'Mercearia' },
  { name: 'Milho Verde em Conserva 170g', brand: 'Quero', suggestedCategory: 'Mercearia' },
  { name: 'Ervilha em Conserva 170g', brand: 'Quero', suggestedCategory: 'Mercearia' },
  { name: 'Sardinha em Lata 125g', brand: 'Gomes da Costa', suggestedCategory: 'Mercearia' },
  { name: 'Atum Ralado em Lata 170g', brand: 'Gomes da Costa', suggestedCategory: 'Mercearia' },
  { name: 'Leite Condensado 395g', brand: 'Moça', suggestedCategory: 'Mercearia' },
  { name: 'Creme de Leite 200g', brand: 'Nestlé', suggestedCategory: 'Mercearia' },
  { name: 'Achocolatado em Pó 400g', brand: 'Nescau', suggestedCategory: 'Mercearia' },
  { name: 'Biscoito Recheado Chocolate 130g', brand: 'Trakinas', suggestedCategory: 'Mercearia' },
  { name: 'Biscoito Cream Cracker 400g', brand: 'Bauducco', suggestedCategory: 'Mercearia' },
  { name: 'Bolacha Maizena 400g', brand: 'Marilan', suggestedCategory: 'Mercearia' },
  { name: 'Aveia em Flocos 200g', brand: 'Quaker', suggestedCategory: 'Mercearia' },
  { name: 'Macarrão Instantâneo 85g', brand: 'Nissin', suggestedCategory: 'Mercearia' },
  { name: 'Caldo de Galinha 57g', brand: 'Knorr', suggestedCategory: 'Mercearia' },
  { name: 'Vinagre de Álcool 750ml', brand: 'Castelo', suggestedCategory: 'Mercearia' },
  { name: 'Maionese 500g', brand: "Hellmann's", suggestedCategory: 'Mercearia' },
  { name: 'Ketchup 380g', brand: 'Heinz', suggestedCategory: 'Mercearia' },
  { name: 'Mostarda 200g', brand: 'Heinz', suggestedCategory: 'Mercearia' },

  // ---------- Frios e Laticínios ----------
  { name: 'Leite Integral 1L', brand: 'Italac', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Leite Desnatado 1L', brand: 'Piracanjuba', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Manteiga com Sal 200g', brand: 'Aviação', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Margarina 500g', brand: 'Qualy', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Queijo Mussarela Fatiado 150g', brand: 'Sadia', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Presunto Fatiado 200g', brand: 'Seara', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Requeijão Cremoso 200g', brand: 'Catupiry', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Iogurte Natural 170g', brand: 'Danone', suggestedCategory: 'Frios e Laticínios' },
  { name: 'Ovos Brancos Dúzia', suggestedCategory: 'Frios e Laticínios', unit: 'PCT' },

  // ---------- Padaria ----------
  { name: 'Pão de Forma Tradicional 500g', brand: 'Pullman', suggestedCategory: 'Padaria' },
  { name: 'Pão Francês', suggestedCategory: 'Padaria', unit: 'KG' },
  { name: 'Bisnaguinha 300g', brand: 'Plus Vita', suggestedCategory: 'Padaria' },

  // ---------- Hortifruti ----------
  { name: 'Banana Prata', suggestedCategory: 'Hortifruti', unit: 'KG' },
  { name: 'Maçã Gala', suggestedCategory: 'Hortifruti', unit: 'KG' },
  { name: 'Tomate', suggestedCategory: 'Hortifruti', unit: 'KG' },
  { name: 'Cebola', suggestedCategory: 'Hortifruti', unit: 'KG' },
  { name: 'Batata Inglesa', suggestedCategory: 'Hortifruti', unit: 'KG' },
  { name: 'Alho', suggestedCategory: 'Hortifruti', unit: 'KG' },
  { name: 'Laranja Pera', suggestedCategory: 'Hortifruti', unit: 'KG' },

  // ---------- Limpeza ----------
  { name: 'Detergente Líquido Neutro 500ml', brand: 'Ypê', suggestedCategory: 'Limpeza' },
  { name: 'Sabão em Pó 1kg', brand: 'Omo', suggestedCategory: 'Limpeza' },
  { name: 'Sabão em Barra 200g', brand: 'Ypê', suggestedCategory: 'Limpeza' },
  { name: 'Amaciante de Roupas 2L', brand: 'Comfort', suggestedCategory: 'Limpeza' },
  { name: 'Água Sanitária 2L', brand: 'Qboa', suggestedCategory: 'Limpeza' },
  { name: 'Desinfetante 2L', brand: 'Pinho Sol', suggestedCategory: 'Limpeza' },
  { name: 'Limpa Vidros 500ml', brand: 'Veja', suggestedCategory: 'Limpeza' },
  { name: 'Esponja de Aço 8un', brand: 'Bombril', suggestedCategory: 'Limpeza', unit: 'PCT' },
  { name: 'Esponja Multiuso', brand: 'Scotch-Brite', suggestedCategory: 'Limpeza' },
  { name: 'Saco de Lixo 50L 30un', brand: 'Dover Roll', suggestedCategory: 'Limpeza', unit: 'PCT' },
  { name: 'Papel Toalha 2 rolos', brand: 'Snob', suggestedCategory: 'Limpeza', unit: 'PCT' },

  // ---------- Higiene ----------
  { name: 'Papel Higiênico 12 rolos', brand: 'Neve', suggestedCategory: 'Higiene', unit: 'PCT' },
  { name: 'Sabonete em Barra 85g', brand: 'Dove', suggestedCategory: 'Higiene' },
  { name: 'Creme Dental 90g', brand: 'Colgate', suggestedCategory: 'Higiene' },
  { name: 'Escova de Dente', brand: 'Oral-B', suggestedCategory: 'Higiene' },
  { name: 'Shampoo 350ml', brand: 'Seda', suggestedCategory: 'Higiene' },
  { name: 'Condicionador 350ml', brand: 'Seda', suggestedCategory: 'Higiene' },
  { name: 'Desodorante Aerosol 150ml', brand: 'Rexona', suggestedCategory: 'Higiene' },
  { name: 'Absorvente 8un', brand: 'Always', suggestedCategory: 'Higiene', unit: 'PCT' },
  { name: 'Fralda Descartável M 30un', brand: 'Pampers', suggestedCategory: 'Higiene', unit: 'PCT' },

  // ---------- Doces e Snacks ----------
  { name: 'Chocolate ao Leite 90g', brand: 'Lacta', suggestedCategory: 'Doces e Snacks' },
  { name: 'Bombom Sortido 250g', brand: 'Garoto', suggestedCategory: 'Doces e Snacks' },
  { name: 'Salgadinho de Milho 100g', brand: 'Doritos', suggestedCategory: 'Doces e Snacks' },
  { name: 'Batata Palha 100g', brand: 'Yoki', suggestedCategory: 'Doces e Snacks' },
  { name: 'Amendoim Salgado 150g', brand: 'Dori', suggestedCategory: 'Doces e Snacks' },
  { name: 'Bala de Goma 100g', brand: 'Fini', suggestedCategory: 'Doces e Snacks' },

  // ---------- Gás e Carvão ----------
  { name: 'Botijão de Gás 13kg', suggestedCategory: 'Gás e Carvão', unit: 'UN' },
  { name: 'Carvão Vegetal 3kg', suggestedCategory: 'Gás e Carvão', unit: 'PCT' },
]
