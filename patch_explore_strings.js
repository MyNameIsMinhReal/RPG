const fs = require('fs');
const path = 'src/commands/explore.ts';
let t = fs.readFileSync(path, 'utf8');
const old1 = `  const embed = new EmbedBuilder().setColor(COLORS.info).setTitle('🩺 Người Lữ Hành Bị Thương')
    .setDescription('*Bạn gặp một người bị thương bên đường...*

> ⚕️ Cứu người đó — tốn potion hoặc gold, nhận lòng biết ơn

> 💼 Lục đồ rồi bỏ đi — lấy vàng/vật phẩm

> ❓ Hỏi thông tin — có thể biết vị trí dungeon/shop/boss');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(`;
const rep1 = `  const embed = new EmbedBuilder().setColor(COLORS.info).setTitle('🩺 Người Lữ Hành Bị Thương')
    .setDescription(`*Bạn gặp một người bị thương bên đường...*

> ⚕️ Cứu người đó — tốn potion hoặc gold, nhận lòng biết ơn

> 💼 Lục đồ rồi bỏ đi — lấy vàng/vật phẩm

> ❓ Hỏi thông tin — có thể biết vị trí dungeon/shop/boss`);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(`;
const old2 = `  const embed = new EmbedBuilder().setColor(COLORS.purple).setTitle('📦 Rương Cổ Bị Nguyền')
    .setDescription('*Một cái rương cổ nằm giữa rễ cây...*

> 🔓 Mở rương — có thể nhận item hiếm hoặc dính curse

> 🕵️ Kiểm tra bẫy — giảm nguy cơ bị bẫy

> 🔨 Phá rương — ít reward hơn nhưng an toàn hơn

> 🚶 Bỏ qua');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(`;
const rep2 = `  const embed = new EmbedBuilder().setColor(COLORS.purple).setTitle('📦 Rương Cổ Bị Nguyền')
    .setDescription(`*Một cái rương cổ nằm giữa rễ cây...*

> 🔓 Mở rương — có thể nhận item hiếm hoặc dính curse

> 🕵️ Kiểm tra bẫy — giảm nguy cơ bị bẫy

> 🔨 Phá rương — ít reward hơn nhưng an toàn hơn

> 🚶 Bỏ qua`);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(`;
if (!t.includes(old1) || !t.includes(old2)) {
  console.error('One of the expected blocks was not found');
  process.exit(1);
}
t = t.replace(old1, rep1).replace(old2, rep2);
fs.writeFileSync(path, t, 'utf8');
console.log('patched strings');
