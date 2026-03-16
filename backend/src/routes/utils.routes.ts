import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../utils/async-handler'
import { verifyEmailAddress } from '../utils/email-verifier'

const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Muitas solicitações. Tente novamente em alguns minutos.',
})

router.get('/email/verify', limiter, asyncHandler(async (req, res) => {
  const email = (req.query.email as string) || ''
  const result = await verifyEmailAddress(email)
  res.json({
    success: true,
    data: result,
  })
}))

export default router

