import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BigNumber } from 'bignumber.js'
// import { useTransactionAdder } from '../../state/transactions/hooks'
import { useActiveWeb3React } from '../../hooks'
import { useRouterConfigContract } from '../../hooks/useContract'
import { useAppState } from '../../state/application/hooks'
import { OptionWrapper, OptionLabel, Input, Button } from './Contracts'
import Accordion from '../../components/Accordion'

enum Direction {
  from,
  to
}

const formatAmount = (n: string | undefined, direction: Direction) => {
  if (!n) return n
  // prevent from  exponential notation: ex. 1e+24
  BigNumber.config({ EXPONENTIAL_AT: 1e9 })

  const WEI_DECIMALS = 18

  switch (direction) {
    case Direction.from:
      return new BigNumber(n).div(10 ** WEI_DECIMALS).toString()
    case Direction.to:
      return new BigNumber(n).times(10 ** WEI_DECIMALS).toString()
    default:
      return n
  }
}

const MILLION = 1_000_000

export default function SwapSettings({
  underlying
}: {
  underlying: {
    address: string
    name: string
    symbol: string
    decimals: number
  }
}) {
  const { library, chainId } = useActiveWeb3React()
  const { t } = useTranslation()
  // const addTransaction = useTransactionAdder()
  const { routerConfigChainId, routerConfigAddress } = useAppState()
  const routerConfig = useRouterConfigContract(routerConfigAddress, routerConfigChainId || 0, true)
  const [pending, setPending] = useState(false)

  /* 
    template data:

    "MinimumSwap": 100 , 
    "MaximumSwap": 1000000,  
    "MinimumSwapFee":  1.5 
    "MaximumSwapFee": 10,
    "BigValueThreshold": 100000, 
    "SwapFeeRatePerMillion": 0.001 ,
    */
  const [minimumSwap, setMinimumSwap] = useState<string | undefined>(undefined)
  const [maximumSwap, setMaximumSwap] = useState<string | undefined>(undefined)
  const [minimumSwapFee, setMinimumSwapFee] = useState<string | undefined>(undefined)
  const [maximumSwapFee, setMaximumSwapFee] = useState<string | undefined>(undefined)
  const [bigValueThreshold, setBigValueThreshold] = useState<string | undefined>(undefined)
  const [swapFeeRatePerMillion, setSwapFeeRatePerMillion] = useState<string | undefined>(undefined)

  const [canSetSwapConfig, setCanSetSwapConfig] = useState(false)

  useEffect(() => {
    setCanSetSwapConfig(
      Boolean(
        routerConfig &&
          underlying.name &&
          minimumSwap &&
          maximumSwap &&
          minimumSwapFee &&
          maximumSwapFee &&
          bigValueThreshold
      )
    )
  }, [routerConfig, underlying.name, minimumSwap, maximumSwap, minimumSwapFee, maximumSwapFee, bigValueThreshold])

  useEffect(() => {
    const fetchSwapConfig = async () => {
      if (!library || !underlying.name) return

      if (routerConfig) {
        const {
          MaximumSwap,
          MinimumSwap,
          BigValueThreshold,
          SwapFeeRatePerMillion,
          MaximumSwapFee,
          MinimumSwapFee
        } = await routerConfig.getSwapConfig(underlying.name, chainId)

        setMinimumSwap(formatAmount(MinimumSwap.toString(), Direction.from))
        setMaximumSwap(formatAmount(MaximumSwap.toString(), Direction.from))
        setMinimumSwapFee(formatAmount(MinimumSwapFee.toString(), Direction.from))
        setMaximumSwapFee(formatAmount(MaximumSwapFee.toString(), Direction.from))
        setBigValueThreshold(formatAmount(BigValueThreshold.toString(), Direction.from))
        setSwapFeeRatePerMillion(new BigNumber(SwapFeeRatePerMillion.toString()).div(MILLION).toString())
      }
    }

    fetchSwapConfig()
  }, [underlying, chainId])

  const setSwapConfig = async () => {
    if (!routerConfig || !canSetSwapConfig) return

    setPending(true)

    try {
      const result = await routerConfig.setSwapConfig(underlying.name, chainId, {
        MinimumSwap: formatAmount(minimumSwap, Direction.to),
        MaximumSwap: formatAmount(maximumSwap, Direction.to),
        MinimumSwapFee: formatAmount(minimumSwapFee, Direction.to),
        MaximumSwapFee: formatAmount(maximumSwapFee, Direction.to),
        BigValueThreshold: formatAmount(bigValueThreshold, Direction.to),
        SwapFeeRatePerMillion: new BigNumber(swapFeeRatePerMillion || 0).times(MILLION).toString()
      })

      console.group('%c set swap config result', 'color: orange;font-size: 20px')
      console.log('result: ', result)
      console.groupEnd()

      // addTransaction(
      //   { hash },
      //   {
      //     summary: `Deployment: chain ${chainId}; crosschain token ${name} ${address}`
      //   }
      // )
    } catch (error) {
      console.error(error)
    }

    setPending(false)
  }

  return (
    <Accordion title={t('Swap config')} margin="0 0 0.5rem">
      <OptionWrapper>
        <OptionWrapper>
          <OptionLabel>
            {t('minimumSwapAmount')}
            <Input defaultValue={minimumSwap} type="number" onChange={event => setMinimumSwap(event.target.value)} />
          </OptionLabel>
        </OptionWrapper>

        <OptionWrapper>
          <OptionLabel>
            {t('maximumSwapAmount')}
            <Input defaultValue={maximumSwap} type="number" onChange={event => setMaximumSwap(event.target.value)} />
          </OptionLabel>
        </OptionWrapper>

        <OptionWrapper>
          <OptionLabel>
            {t('minimumSwapFee')}
            <Input
              defaultValue={minimumSwapFee}
              type="number"
              onChange={event => setMinimumSwapFee(event.target.value)}
            />
          </OptionLabel>
        </OptionWrapper>

        <OptionWrapper>
          <OptionLabel>
            {t('maximumSwapFee')}
            <Input
              defaultValue={maximumSwapFee}
              type="number"
              onChange={event => setMaximumSwapFee(event.target.value)}
            />
          </OptionLabel>
        </OptionWrapper>

        <OptionWrapper>
          <OptionLabel>
            {t('bigValueThreshold')} (what is this and how does it affect the swap?)
            <Input
              defaultValue={bigValueThreshold}
              type="number"
              onChange={event => setBigValueThreshold(event.target.value)}
            />
          </OptionLabel>
        </OptionWrapper>

        <OptionWrapper>
          <OptionLabel>
            {t('swapFeeRatePerMillion')} (how does it work?)
            <Input
              defaultValue={swapFeeRatePerMillion}
              type="number"
              onChange={event => setSwapFeeRatePerMillion(event.target.value)}
            />
          </OptionLabel>
        </OptionWrapper>

        <Button disabled={pending || !canSetSwapConfig} onClick={setSwapConfig}>
          {t('setSwapConfig')}
        </Button>
      </OptionWrapper>
    </Accordion>
  )
}
