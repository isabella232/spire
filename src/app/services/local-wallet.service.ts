import { Network } from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { TezosProtocol } from 'airgap-coin-lib'
import * as bip39 from 'bip39'
import { Observable, ReplaySubject } from 'rxjs'
import { Action, ExtensionMessageOutputPayload, WalletInfo, WalletType } from 'src/extension/extension-client/Actions'

import { ChromeMessagingService } from './chrome-messaging.service'

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private readonly _wallets: ReplaySubject<WalletInfo<WalletType>[]> = new ReplaySubject(1)
  private readonly _activeWallet: ReplaySubject<WalletInfo<WalletType>> = new ReplaySubject(1)
  private readonly _activeNetwork: ReplaySubject<Network> = new ReplaySubject(1)

  public readonly wallets$: Observable<WalletInfo<WalletType>[]> = this._wallets.asObservable()
  public readonly activeWallet$: Observable<WalletInfo<WalletType>> = this._activeWallet.asObservable()
  public readonly activeNetwork$: Observable<Network> = this._activeNetwork.asObservable()

  constructor(private readonly chromeMessagingService: ChromeMessagingService) {
    this.updateWallets().catch(console.error)
    this.loadNetwork().catch(console.error)
  }

  public async updateWallets(): Promise<void> {
    this.getWallets().catch(console.error)
    this.getActiveWallet().catch(console.error)
  }

  public async loadNetwork(): Promise<void> {
    const data: ExtensionMessageOutputPayload<Action.ACTIVE_NETWORK_GET> = await this.chromeMessagingService.sendChromeMessage(
      Action.ACTIVE_NETWORK_GET,
      undefined
    )

    if (data.data) {
      this._activeNetwork.next(data.data.network)
    }
  }

  public async setNetwork(network: Network): Promise<void> {
    await this.chromeMessagingService.sendChromeMessage(Action.ACTIVE_NETWORK_SET, { network })
    await this.loadNetwork()
  }

  public async getWallets(): Promise<void> {
    this.chromeMessagingService
      .sendChromeMessage(Action.WALLETS_GET, undefined)
      .then((response: ExtensionMessageOutputPayload<Action.WALLETS_GET>) => {
        if (response.data) {
          this._wallets.next(response.data.wallets)
        }
      })
      .catch(console.error)
  }

  public async getActiveWallet(): Promise<void> {
    this.chromeMessagingService
      .sendChromeMessage(Action.ACTIVE_WALLET_GET, undefined)
      .then((response: ExtensionMessageOutputPayload<Action.ACTIVE_WALLET_GET>) => {
        if (response.data && response.data.wallet) {
          this._activeWallet.next(response.data.wallet)
        }
      })
      .catch(console.error)
  }

  public async saveMnemonic(mnemonic: string): Promise<void> {
    if (mnemonic && bip39.validateMnemonic(mnemonic)) {
      const {
        publicKey,
        address
      }: {
        privateKey: string
        publicKey: string
        address: string
      } = await this.mnemonicToAddress(mnemonic)
      const walletInfo: WalletInfo<WalletType.LOCAL_MNEMONIC> = {
        address,
        pubkey: publicKey,
        type: WalletType.LOCAL_MNEMONIC,
        added: new Date(),
        info: {
          mnemonic
        }
      }

      await this.addAndActiveWallet(walletInfo)
    }
  }

  public async addAndActiveWallet(walletInfo: WalletInfo<WalletType>): Promise<void> {
    await this.chromeMessagingService.sendChromeMessage(Action.WALLET_ADD, { wallet: walletInfo })
    await this.chromeMessagingService.sendChromeMessage(Action.ACTIVE_WALLET_SET, { wallet: walletInfo })

    await this.updateWallets()
  }

  public async setActiveWallet(walletInfo: WalletInfo<WalletType>): Promise<void> {
    await this.chromeMessagingService.sendChromeMessage(Action.ACTIVE_WALLET_SET, { wallet: walletInfo })

    await this.getActiveWallet()
  }

  public async deleteWallet(walletInfo: WalletInfo<WalletType>): Promise<void> {
    await this.chromeMessagingService.sendChromeMessage(Action.WALLET_DELETE, { wallet: walletInfo })

    await this.updateWallets()
  }

  private async mnemonicToAddress(
    mnemonic: string
  ): Promise<{
    privateKey: string
    publicKey: string
    address: string
  }> {
    const protocol: TezosProtocol = new TezosProtocol()
    const privateKey: string = (
      await protocol.getPrivateKeyFromMnemonic(mnemonic, protocol.standardDerivationPath)
    ).toString('hex')

    const publicKey: string = await protocol.getPublicKeyFromMnemonic(mnemonic, protocol.standardDerivationPath)

    const address: string = await protocol.getAddressFromPublicKey(publicKey)

    return {
      privateKey,
      publicKey,
      address
    }
  }
}
