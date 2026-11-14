// Roda antes de cada arquivo de teste. Aqui ficam os substitutos (mocks)
// dos modulos nativos que nao existem fora do aparelho.

// As margens seguras (barra de status, gesto de voltar) viram zero no Jest.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
