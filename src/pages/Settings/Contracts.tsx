import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useActiveWeb3React } from '../../hooks'
import { useAppState } from '../../state/application/hooks'
import { chainInfo } from '../../config/chainConfig'
import { updateStorageData } from '../../utils/storage'
import { getWeb3Library } from '../../utils/getLibrary'
import { useRouterConfigContract } from '../../hooks/useContract'
import { EVM_ADDRESS_REGEXP, ZERO_ADDRESS } from '../../constants'
import Accordion from '../../components/Accordion'
import DeployRouterConfig from './DeployRouterConfig'
import DeployRouter from './DeployRouter'
import DeployCrosschainToken from './DeployCrosschainToken'
import SwapSettings from './SwapSettings'
import { Notice } from './index'
// import config from '../../config'

export const OptionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  margin: 0.5rem 0;
  font-size: 1.2rem;
`

export const OptionLabel = styled.label`
  display: flex;
  flex-direction: column;
`

export const Input = styled.input`
  padding: 0.4rem 0;
  margin: 0.2rem 0;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.text3};
  outline: none;
  font-size: inherit;
  background-color: transparent;
  color: inherit;
`

const ZoneWrapper = styled.div<{ blocked?: boolean }>`
  margin: 0.4rem 0;
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
  border-radius: 0.5rem;
  border: 1px solid ${({ theme }) => theme.text4};

  ${({ blocked }) =>
    blocked
      ? `
      opacity: 0.5;
      pointer-events: none;
    `
      : ''}
`

const ConfigInfo = styled.span`
  padding: 0.2rem;
  border: 1px solid green;
`

export const Button = styled.button`
  cursor: pointer;
  width: 100%;
  font-size: inherit;
  border: none;
  border-radius: 0.5rem;
  padding: 0.3rem;
`

export default function Contracts() {
  const { chainId, account, library } = useActiveWeb3React()
  const { t } = useTranslation()

  const {
    routerConfigChainId: stateRouterConfigChainId,
    routerConfigAddress: stateRouterConfigAddress,
    routerAddress: stateRouterAddress
  } = useAppState()

  const routerConfig = useRouterConfigContract(stateRouterConfigAddress, stateRouterConfigChainId || 0, true)

  const [routerConfigChainId, setRouterConfigChainId] = useState<string>(`${stateRouterConfigChainId}` || '')
  const [routerConfigAddress, setRouterConfigAddress] = useState<string>(stateRouterConfigAddress)

  const saveRouterConfig = (routerConfigAddress: string, chainId: number) => {
    if (!account) return

    return updateStorageData({
      provider: library?.provider,
      owner: account,
      data: {
        routerConfigAddress,
        routerConfigChainId: chainId
      },
      onHash: (hash: string) => {
        console.group('%c Log', 'color: orange; font-size: 14px')
        console.log('hash: ', hash)
        console.groupEnd()
      }
    })
  }

  const [routerChainId, setRouterChainId] = useState('')
  const [routerAddress, setRouterAddress] = useState('')

  useEffect(() => {
    if (chainId !== undefined && stateRouterAddress[chainId]) {
      setRouterChainId(String(chainId))
      setRouterAddress(stateRouterAddress[chainId])
    } else {
      setRouterChainId('')
      setRouterAddress('')
    }
  }, [chainId])

  const setChainConfig = async (routerAddress: string, chainId: number) => {
    if (!routerConfig || stateRouterConfigChainId !== chainId) return

    try {
      const { name } = chainInfo[chainId]

      await routerConfig.setChainConfig(chainId, {
        BlockChain: name,
        RouterContract: routerAddress,
        Confirmations: 3,
        InitialHeight: 0
      })
    } catch (error) {
      console.error(error)
    }
  }

  const [underlyingToken, setUnderlyingToken] = useState('')
  const [underlyingName, setUnderlyingName] = useState('')
  const [underlyingSymbol, setUnderlyingSymbol] = useState('')
  const [underlyingDecimals, setUnderlyingDecimals] = useState(-1)
  const [crosschainToken, setCrosschainToken] = useState('')
  const [crosschainTokenChainId, setCrosschainTokenChainId] = useState(0)

  useEffect(() => {
    const fetchUnderlyingInfo = async () => {
      if (!library || !underlyingToken || !chainId) return

      try {
        const web3 = getWeb3Library(library.provider)
        const code = await web3.eth.getCode(underlyingToken)

        if (code === '0x') return console.log('wrong address for this network')

        //@ts-ignore
        const contract = new web3.eth.Contract(ERC20_ABI, underlyingToken)
        const name = await contract.methods.name().call()
        const symbol = await contract.methods.symbol().call()
        const decimals = await contract.methods.decimals().call()

        setUnderlyingName(name)
        setUnderlyingSymbol(symbol)
        setUnderlyingDecimals(decimals)

        if (routerConfig) {
          const tokenConfig = await routerConfig.getTokenConfig(name, chainId)

          if (tokenConfig.ContractAddress && tokenConfig.ContractAddress !== ZERO_ADDRESS) {
            setCrosschainTokenChainId(chainId)
            setCrosschainToken(tokenConfig.ContractAddress)
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    if (chainId && underlyingToken.match(EVM_ADDRESS_REGEXP)) {
      fetchUnderlyingInfo()
    }
  }, [underlyingToken, chainId])

  const setTokenConfig = async () => {
    if (!routerConfig || !underlyingName) return

    const VERSION = 6

    try {
      await routerConfig.setTokenConfig(underlyingName, crosschainTokenChainId, {
        Decimals: underlyingDecimals,
        ContractAddress: crosschainToken,
        ContractVersion: VERSION
      })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      <Notice>
        {stateRouterConfigChainId && stateRouterConfigAddress ? (
          <>
            <ConfigInfo>
              {t('configInformation')}: {stateRouterConfigChainId} - {chainInfo[stateRouterConfigChainId]?.name || ''}
            </ConfigInfo>
            {t('youHaveToBeOnConfigNetwork')}. {t('saveAllInfoWhenYouDeployAnything')}.{' '}
            {t('setDeploymentInfoOnConfigNetwork')}
          </>
        ) : (
          <>
            {t('youNeedToDeployConfigFirst')}. {t('youCanDeployConfigToAnyNetwork')}.{' '}
            {t('youNeedOnlyOneConfigContract')}
          </>
        )}
      </Notice>

      {!stateRouterConfigAddress && (
        <ZoneWrapper>
          <DeployRouterConfig />
          <OptionWrapper>
            {t('afterConfigDeploymentFillTheseInputsAndSaveInfo')}
            <OptionLabel>
              {t('configChainId')}
              <Input type="number" placeholder="0x..." onChange={event => setRouterConfigChainId(event.target.value)} />
              {t('configAddress')}
              <Input type="text" placeholder="0x..." onChange={event => setRouterConfigAddress(event.target.value)} />
            </OptionLabel>
          </OptionWrapper>
          <Button onClick={() => saveRouterConfig(routerConfigAddress, Number(routerConfigChainId))}>
            {t('saveConfig')}
          </Button>
        </ZoneWrapper>
      )}

      {!routerAddress && (
        <ZoneWrapper blocked={!routerConfigAddress}>
          <Notice>{t('youNeedToHaveOneRouterForEachNetwork')}</Notice>
          <DeployRouter />

          <OptionWrapper>
            {t('afterRouterDeploymentFillTheseInputsAndSaveInfo')}
            <OptionLabel>
              {t('routerChainId')}
              <Input type="number" placeholder="0x..." onChange={event => setRouterChainId(event.target.value)} />
              {t('routerAddress')}
              <Input type="text" placeholder="0x..." onChange={event => setRouterAddress(event.target.value)} />
            </OptionLabel>
          </OptionWrapper>
          <Button onClick={() => setChainConfig(routerAddress, Number(routerChainId))}>{t('setChainConfig')}</Button>
        </ZoneWrapper>
      )}

      <ZoneWrapper blocked={!routerConfigAddress || !routerAddress}>
        <Notice>{t('youNeedToDeployCrosschainTokenForEachSourceTokenOnEachNetwork')}</Notice>
        <DeployCrosschainToken
          routerAddress={routerAddress}
          underlying={{
            address: underlyingToken,
            name: underlyingName,
            symbol: underlyingSymbol,
            decimals: Number(underlyingDecimals)
          }}
        />

        <Accordion title={t('Token config')} margin="0.5rem 0">
          <OptionWrapper>
            <OptionLabel>
              {t('erc20TokenAddress')}
              <Input type="text" placeholder="0x..." onChange={event => setUnderlyingToken(event.target.value)} />
            </OptionLabel>
          </OptionWrapper>
          <OptionWrapper>
            <OptionLabel>
              {t('idOfCrosschainTokenNetwork')}
              <Input
                defaultValue={crosschainTokenChainId}
                type="number"
                onChange={event => setCrosschainTokenChainId(Number(event.target.value))}
              />
            </OptionLabel>
          </OptionWrapper>
          <OptionWrapper>
            <OptionLabel>
              {t('crosschainTokenAddress')}
              <Input
                defaultValue={crosschainToken}
                type="text"
                placeholder="0x..."
                onChange={event => setCrosschainToken(event.target.value)}
              />
            </OptionLabel>
          </OptionWrapper>
          <Button onClick={setTokenConfig}>{t('setTokenConfig')}</Button>
        </Accordion>
      </ZoneWrapper>

      <ZoneWrapper>
        <SwapSettings
          underlying={{
            address: underlyingToken,
            name: underlyingName,
            symbol: underlyingSymbol,
            decimals: Number(underlyingDecimals)
          }}
        />
      </ZoneWrapper>
    </div>
  )
}
