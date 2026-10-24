// Nettoyage manuel de securite : node tests/e2e/parcours/nettoyer.mjs
import { nettoyer, residus } from './donnees-test.js'

console.log('nettoyage', await nettoyer())
console.log('residus (tout doit valoir 0)', await residus())
