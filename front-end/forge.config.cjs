module.exports = {
  packagerConfig: {
    asar: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'AccessGuardAI',
        authors: 'AccessGuard AI Team',
        description: 'CCTV 접근성 AI 관제 프로그램',
        setupExe: 'cctv 접근성 ai-Setup.exe',
      },
    },
  ],
}