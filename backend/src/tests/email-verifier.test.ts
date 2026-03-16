import { describe, it, expect, vi } from 'vitest'
import { verifyEmailAddress } from '../utils/email-verifier'

class FakeResolver {
  resolveMx = vi.fn(async (domain: string) => {
    if (domain === 'zello.tec.br') return [{ exchange: 'mx.zello.tec.br', priority: 10 }]
    if (domain === 'nomx.example') throw new Error('ENOTFOUND')
    return []
  })
}

describe('verifyEmailAddress', () => {
  it('valida formato e MX encontrado', async () => {
    const res = await verifyEmailAddress('user@zello.tec.br', new FakeResolver() as any)
    expect(res.formatValid).toBe(true)
    expect(res.domain).toBe('zello.tec.br')
    expect(res.mxFound).toBe(true)
    expect(res.allowedDomain).toBe(true)
    expect(res.disposable).toBe(false)
  })

  it('detecta ausência de MX', async () => {
    const res = await verifyEmailAddress('user@nomx.example', new FakeResolver() as any)
    expect(res.formatValid).toBe(true)
    expect(res.mxFound).toBe(false)
  })

  it('formato inválido retorna formatValid=false', async () => {
    const res = await verifyEmailAddress('invalid-email', new FakeResolver() as any)
    expect(res.formatValid).toBe(false)
    expect(res.domain).toBeNull()
    expect(res.mxFound).toBe(false)
  })

  it('normaliza espaços e caixa e valida allowedDomain', async () => {
    const res = await verifyEmailAddress('  User@ZELLO.TEC.BR  ', new FakeResolver() as any)
    expect(res.formatValid).toBe(true)
    expect(res.domain).toBe('zello.tec.br')
    expect(res.allowedDomain).toBe(true)
  })

  it('marca domínio descartável corretamente', async () => {
    const res = await verifyEmailAddress('temp@mailinator.com', new FakeResolver() as any)
    expect(res.formatValid).toBe(true)
    expect(res.disposable).toBe(true)
    expect(res.allowedDomain).toBe(false)
  })

  it('subdomínio não é permitido por política atual', async () => {
    const res = await verifyEmailAddress('user@sub.zello.tec.br', new FakeResolver() as any)
    expect(res.formatValid).toBe(true)
    expect(res.domain).toBe('sub.zello.tec.br')
    expect(res.allowedDomain).toBe(false)
  })
})
