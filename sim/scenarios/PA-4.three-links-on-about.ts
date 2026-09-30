import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'PA-4',
  'About links to translationCore, BT Servant and Foundations BT and nothing else, each with one sentence',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const links = servicesOf(phone).about.links();
    assert.deepEqual(
      links.map((link) => [link.id, link.title, link.url]),
      [
        ['translationCore', 'translationCore', 'https://www.translationcore.com'],
        ['btServant', 'BT Servant', 'https://unfoldingword.org'],
        ['foundationsBt', 'Foundations BT', 'https://foundationsbt.com'],
      ],
    );
    for (const link of links) {
      assert.match(link.about, /^[^.?!]+\.$/u, `${link.id} says what it is for in one sentence`);
    }
    assert.equal(
      links.find((link) => link.id === 'foundationsBt')?.about.includes('Tano Story Series'),
      true,
    );
  },
);
