import * as alt from 'alt-client';
import * as native from 'natives';
import * as AthenaClient from '@AthenaClient/api';
import ViewModel from '../../../client/models/viewModel';
import { PedCharacter } from '../../../client/utility/characterPed';
import { SYSTEM_EVENTS } from '../../../shared/enums/system';
import { Appearance } from '../../../shared/interfaces/appearance';
import { ClothingComponent, Item } from '../../../shared/interfaces/item';
import { CLOTHING_CONFIG } from '../shared/config';
import { CLOTHING_INTERACTIONS } from '../shared/events';
import { CLOTHING_DLC_INFO, IClothingStore } from '../shared/interfaces';
import { ComponentVueInfo } from '../shared/types';
import { ClothingInfo } from '@AthenaShared/utility/clothing';

const FreemodeFemale01 = 2627665880;
const FreeModeMale01 = 1885233650;

const PAGE_NAME = 'Clothing';
const CAMERA_POSITIONS = [
    { zpos: 0.6, fov: 33 }, // Hat
    { zpos: 0.6, fov: 33 }, // Mask
    { zpos: 0.18999999999999967, fov: 49 }, // Shirt
    { zpos: -0.47000000000000064, fov: 59 }, // Bottoms
    { zpos: -0.7100000000000009, fov: 53 }, // Shoes
    { zpos: 0.61, fov: 29 }, // Glasses
    { zpos: 0.62, fov: 29 }, // Earrings / Earpieces
    { zpos: 0.2799999999999997, fov: 57 }, // Backpacks
    { zpos: 0.2799999999999997, fov: 57 }, // Armour
    { zpos: -0.09999999999999902, fov: 45 }, // Wrist Watch
    { zpos: -0.09999999999999902, fov: 45 }, // Bracelet
];

let equipment: Array<Item> = [];
let appearance: Appearance = null;
let storeData: IClothingStore = null;
let isOpen = false;

/**
 * Do Not Export Internal Only
 */
class InternalFunctions implements ViewModel {
    static async open(_storeData: IClothingStore, _appearance: Appearance, _equipment: Array<Item>) {
        if (AthenaClient.webview.isAnyMenuOpen(true)) {
            return;
        }

        storeData = _storeData;
        appearance = _appearance;
        equipment = _equipment;
       
        AthenaClient.webview.on(CLOTHING_INTERACTIONS.CLOSE, InternalFunctions.close);
        AthenaClient.webview.on(CLOTHING_INTERACTIONS.UPDATE, InternalFunctions.update);
        AthenaClient.webview.on(CLOTHING_INTERACTIONS.PURCHASE, InternalFunctions.purchase);
        AthenaClient.webview.on(CLOTHING_INTERACTIONS.POPULATE, InternalFunctions.populate);
        AthenaClient.webview.on(CLOTHING_INTERACTIONS.DISABLE_CONTROLS, InternalFunctions.controls);
        AthenaClient.webview.on(CLOTHING_INTERACTIONS.PAGE_UPDATE, InternalFunctions.pageUpdate);
        AthenaClient.webview.on(CLOTHING_INTERACTIONS.PURCHASE_ALL, InternalFunctions.purchaseAll);

        native.doScreenFadeOut(100);

        await PedCharacter.destroy();
        
        await alt.Utils.wait(100);

        native.setEntityAlpha(alt.Player.local.scriptID, 0, false);

        await PedCharacter.create(
            appearance.sex === 1 ? true : false,
            alt.Player.local.pos,
            native.getEntityHeading(alt.Player.local.scriptID),
        );

        await PedCharacter.apply(appearance);
        await alt.Utils.wait(100);
        
        if (AthenaClient.camera.pedEdit.exists()) {
            await AthenaClient.camera.pedEdit.destroy();
        }

        await AthenaClient.camera.pedEdit.create(PedCharacter.get(), { x: -0.2, y: 0, z: 0 }, false);
        AthenaClient.camera.pedEdit.setCamParams(0.6, 65);

        InternalFunctions.setEquipment(equipment);

        alt.Player.local.isMenuOpen = true;
        isOpen = true;

        AthenaClient.webview.ready(PAGE_NAME, InternalFunctions.ready);
        AthenaClient.webview.openPages([PAGE_NAME], true, InternalFunctions.closeAsync);
        AthenaClient.webview.focus();
        AthenaClient.webview.showCursor(true);

        // Top Left
        alt.setWatermarkPosition(2);
    }

    static async closeAsync() {
        AthenaClient.webview.unfocus();
        AthenaClient.webview.showCursor(false);
        alt.toggleGameControls(true);
        alt.Player.local.isMenuOpen = false;

        InternalFunctions.close();
    }

    static async close() {
        native.doScreenFadeOut(100);

        await alt.Utils.wait(100);

        AthenaClient.camera.pedEdit.destroy();
        PedCharacter.destroy();

        alt.toggleGameControls(true);
        AthenaClient.webview.setOverlaysVisible(true);
        AthenaClient.webview.closePages([PAGE_NAME]);
        AthenaClient.webview.unfocus();
        AthenaClient.webview.showCursor(false);

        alt.Player.local.isMenuOpen = false;

        native.setEntityAlpha(alt.Player.local.scriptID, 255, false);
        alt.emitServer(CLOTHING_INTERACTIONS.EXIT);
        isOpen = false;

        native.doScreenFadeIn(100);

        alt.setWatermarkPosition(4);
    }

    /**
     * Updates the camera position on page changes.
     * @static
     * @param {number} page
     * @memberof InternalFunctions
     */
    static async pageUpdate(page: number) {
        if (!AthenaClient.camera.pedEdit.exists()) {
            await AthenaClient.camera.pedEdit.create(alt.Player.local.scriptID, { x: -0.2, y: 0, z: 0 }, true);
        }

        if (!CAMERA_POSITIONS[page]) {
            AthenaClient.camera.pedEdit.setCamParams(0.6, 65);
            return;
        }

        AthenaClient.camera.pedEdit.setCamParams(CAMERA_POSITIONS[page].zpos, CAMERA_POSITIONS[page].fov);
    }

    static async ready() {
        AthenaClient.webview.emit(CLOTHING_INTERACTIONS.SET_DATA, storeData);
        AthenaClient.webview.emit(CLOTHING_INTERACTIONS.SET_BANK_DATA, alt.Player.local.meta.bank + alt.Player.local.meta.cash);
        native.doScreenFadeIn(100);
    }

    static async handleMetaChanged(key: string, _items: Array<Item>, _oldValue: any) {
        if (key === 'bank' || (key === 'cash' && isOpen)) {            
            AthenaClient.webview.emit(CLOTHING_INTERACTIONS.SET_BANK_DATA, alt.Player.local.meta.bank + alt.Player.local.meta.cash);
        }
    }

    static setEquipment(items: Array<Item>) {
        const clothingComponents = new Array(11).fill(null);
        native.clearAllPedProps(PedCharacter.get(), 0);

        if (items && Array.isArray(items)) {
            for (let i = 0; i < items.length; i++) {
                clothingComponents[items[i].slot] = items[i].data;
            }
        }

        // Default Components
        alt.logWarning('Setting default components');
        if (alt.Player.local.model !== 1885233650) {
            // Check if not male
            native.setPedComponentVariation(PedCharacter.get(), 1, 0, 0, 0); // mask
            native.setPedComponentVariation(PedCharacter.get(), 3, 0, 0, 0); // arms
            native.setPedComponentVariation(PedCharacter.get(), 4, 14, 0, 0); // pants
            native.setPedComponentVariation(PedCharacter.get(), 5, 0, 0, 0); // bag
            native.setPedComponentVariation(PedCharacter.get(), 6, 35, 0, 0); // shoes
            native.setPedComponentVariation(PedCharacter.get(), 7, 0, 0, 0); // accessories
            native.setPedComponentVariation(PedCharacter.get(), 8, 15, 0, 0); // undershirt
            native.setPedComponentVariation(PedCharacter.get(), 9, 0, 0, 0); // body armour
            native.setPedComponentVariation(PedCharacter.get(), 11, 0, 0, 0); // torso
        } else {
            native.setPedComponentVariation(PedCharacter.get(), 1, 0, 0, 0); // mask
            native.setPedComponentVariation(PedCharacter.get(), 3, 15, 0, 0); // arms
            native.setPedComponentVariation(PedCharacter.get(), 5, 0, 0, 0); // bag
            native.setPedComponentVariation(PedCharacter.get(), 4, 14, 0, 0); // pants
            native.setPedComponentVariation(PedCharacter.get(), 6, 34, 0, 0); // shoes
            native.setPedComponentVariation(PedCharacter.get(), 7, 0, 0, 0); // accessories
            native.setPedComponentVariation(PedCharacter.get(), 8, 15, 0, 0); // undershirt
            native.setPedComponentVariation(PedCharacter.get(), 9, 0, 0, 0); // body armour
            native.setPedComponentVariation(PedCharacter.get(), 11, 91, 0, 0); // torso
        }

        if (!items || !Array.isArray(items)) {
            return;
        }

        InternalFunctions.update(clothingComponents, true);
    }

    static controls(value: boolean) {
        AthenaClient.camera.pedEdit.disableControls(value);
    }

    static getDlcClothingCount(sex: number, id: number, isProp: boolean = false): number {
        const dlcInfos = CLOTHING_CONFIG[isProp ? 'DLC_PROPS' : 'DLC_CLOTHING'][id] as Array<CLOTHING_DLC_INFO>;

        let totalCount = 0;

        for (let i = 0; i < dlcInfos.length; i++) {
            if (dlcInfos[i].count[sex]) {
                totalCount += dlcInfos[i].count[sex];
            }
        }

        return totalCount;
    }

    /**
     * Handles how clothes are purchased.
     * @static
     * @param {string} uid
     * @param {number} index
     * @param {ClothingComponent} component
     * @param {string} name
     * @param {string} desc
     * @memberof InternalFunctions
     */
    static purchase(
        uid: string,
        index: number,
        component: ClothingComponent,
        name: string,
        desc: string,
        noSound = false,
    ) {
        alt.emitServer(CLOTHING_INTERACTIONS.PURCHASE, uid, index, component, name, desc, noSound);
    }

    /**
     * Purchases all components from a shop.
     *
     * @static
     * @param {Array<ComponentVueInfo>} components
     * @memberof InternalFunctions
     */
    static purchaseAll(components: Array<ComponentVueInfo>) {
        alt.emitServer(CLOTHING_INTERACTIONS.PURCHASE_ALL, components);
    }

    static async populate(clothings: Array<ClothingInfo>) {
        if (typeof clothings === 'string') {
            clothings = JSON.parse(clothings);
        }

        for (let i = 0; i < clothings.length; i++) {
            const clothing = clothings[i];
            const components = clothing.components;
            if (!components) {
                continue;
            }

            for (let index = 0; index < components.length; index++) {
                const component = components[index];
                const id = component.id;
                let value = component.drawable;
                let textureValue = component.texture;

                let maxTextures = 0;
                let maxDrawables = 0;

                if (component.isProp) {
                    // Get Current Value of Prop Player is Wearing
                    value = native.getPedPropIndex(PedCharacter.get(), id, 0);
                    //TODO: Fix this, it's not working.
                    // if (typeof component.startValue === 'undefined') {
                    //     component.startValue = value;
                    // }

                    component.drawable = value;

                    textureValue = native.getPedPropTextureIndex(PedCharacter.get(), id);
                    component.texture = textureValue;

                    maxDrawables =
                        CLOTHING_CONFIG.MAXIMUM_PROP_VALUES[appearance.sex][id] +
                        InternalFunctions.getDlcClothingCount(appearance.sex, id, true);

                    maxTextures = native.getNumberOfPedPropTextureVariations(PedCharacter.get(), id, value);
                } else {
                    // Get Current Value of Component Player is Wearing
                    alt.log('populate!!!!: ' + value);
                    value = native.getPedDrawableVariation(PedCharacter.get(), id);
                    alt.log('populate!!!!: ' + value);
                    component.drawable = value;

                    //TODO: Fix this, it's not working.
                    // if (typeof component.startValue === 'undefined') {
                    //     component.startValue = value;
                    // }

                    textureValue = native.getPedTextureVariation(PedCharacter.get(), id);
                    component.texture = textureValue;

                    maxDrawables =
                        CLOTHING_CONFIG.MAXIMUM_COMPONENT_VALUES[appearance.sex][id] +
                        InternalFunctions.getDlcClothingCount(appearance.sex, id, false);

                    maxTextures = native.getNumberOfPedTextureVariations(PedCharacter.get(), id, value);
                }

                //TODO: Fix this, it's not working.
                // component.maxDrawables[index] = maxDrawables;
                // component.maxTextures[index] = maxTextures;
            }
        }

        AthenaClient.webview.emit(CLOTHING_INTERACTIONS.PROPAGATE, clothings);
    }

    static async update(clothings: Array<ClothingInfo>, justSync = false, populateData = false) {
        if (typeof clothings === 'string') {
            clothings = JSON.parse(clothings);
        }

        alt.log('components!!!!: ' + JSON.stringify(clothings));

        for (let i = 0; i < clothings.length; i++) {
            const clothing = clothings[i];
            if (!clothing) {
                continue;
            }

            for (let index = 0; index < clothing.components.length; index++) {
                const component = clothing.components[index];

                //FIXME: remove test case
                // if (id === 5 && drawable === 111) {
                //     component.dlcHashes = ['mp_m_rucksack'];
                //     drawable = 1;
                //     populateData = false;
                // }

                if (component.dlc) {
                    alt.log('DLC HASH!!!! Index : ' + index);
                    alt.log('DLC HASH!!!! : ' + JSON.stringify(component.dlc));
                    let dlc = component.dlc;
                    if (typeof dlc === 'string') {
                        dlc = alt.hash(dlc);
                    }

                    if (component.isProp) {
                        if (component.drawable <= -1) {
                            native.clearPedProp(PedCharacter.get(), component.id, 0);
                            continue;
                        }

                        alt.setPedDlcProp(PedCharacter.get(), dlc, component.id, component.drawable, component.texture);
                        continue;
                    }

                    alt.log('DLC HASH!!!! setPedDlcClothes : ' + dlc + ' ' + component.drawable);
                    alt.setPedDlcClothes(PedCharacter.get(), dlc, component.id, component.drawable, component.texture, 0);
                    continue;
                }

                if (component.isProp) {
                    if (component.drawable <= -1) {
                        native.clearPedProp(PedCharacter.get(), component.id,0);
                        continue;
                    }

                    native.setPedPropIndex(PedCharacter.get(), component.id, component.drawable, component.texture, true,0);
                } else {
                    native.setPedComponentVariation(PedCharacter.get(), component.id, component.drawable, component.texture, 0);
                }
            }
        }

        if (justSync) {
            return;
        }

        AthenaClient.camera.pedEdit.update(PedCharacter.get());

        // Only update data if necessary.
        if (!populateData) {
            return;
        }

        InternalFunctions.populate(clothings);
    }
}

alt.on(SYSTEM_EVENTS.META_CHANGED, InternalFunctions.handleMetaChanged);
alt.onServer(CLOTHING_INTERACTIONS.OPEN, InternalFunctions.open);
