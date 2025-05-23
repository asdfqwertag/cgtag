// ==UserScript==
// @name        좋아요 태그 그룹핑
// @namespace   http://your-namespace.com/
// @version     1.0 // 버전 업데이트!
// @description crack.wrtn.ai 사이트의 좋아요 항목에 태그를 추가하고 태그별로 그룹핑하며, 좋아요 바로가기 버튼을 추가합니다. (충돌 및 태그 관리 오류 해결, 태그 추가 디버깅 강화, 모든 태그 별도 관리)
// @author      YourName
// @match       https://crack.wrtn.ai/*
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // ====================================================================
    //                       유틸리티 함수 및 변수
    // ====================================================================

    const getStoredData = async (key, defaultValue) => {
        const value = GM_getValue(key, JSON.stringify(defaultValue));
        return JSON.parse(value);
    };

    const setStoredData = async (key, value) => {
        GM_setValue(key, JSON.stringify(value));
    };

    // GM_addStyle은 스크립트 로드 시점에 한 번 실행되므로, 동적인 색상 변화를 위해 CSS 변수를 사용합니다.
    GM_addStyle(`
        /* 다크/라이트 모드에 따라 변하는 색상 정의 */
        :root {
            --chasm-border-color: #eee;
            --chasm-text-color: #333;
            --chasm-button-bg: transparent;
            --chasm-button-hover-bg: #f0f0f0;
            --chasm-select-bg: #fff;
            --chasm-select-text: #333;
            --chasm-tag-bg: #e0e0e0;
            --chasm-tag-text: #333;
            --chasm-tag-remove-color: #777;
            --chasm-add-tag-button-bg: #ddd;
            --chasm-add-tag-button-hover-bg: #ccc;

            /* 모달 관련 색상 (사이트 기본 색상 변수 활용) */
            --modal-background-primary: var(--background_primary, #fff);
            --modal-text-primary: var(--text_primary, #333);
            --modal-border-tertiary: var(--border_tertiary, #e0e0e0);
            --modal-background-secondary: var(--background_secondary, #f7f7f7);
            --modal-background-quaternary: var(--background_quaternary, #eee);
            --modal-accent-primary: var(--accent_primary, #4a90e2);
            --modal-text-white: #fff;
        }
        body[data-theme="dark"] {
            --chasm-border-color: #444;
            --chasm-text-color: #b0b0b0;
            --chasm-button-bg: transparent;
            --chasm-button-hover-bg: #333;
            --chasm-select-bg: #333;
            --chasm-select-text: #eee;
            --chasm-tag-bg: #555;
            --chasm-tag-text: #eee;
            --chasm-tag-remove-color: #ddd;
            --chasm-add-tag-button-bg: #666;
            --chasm-add-tag-button-hover-bg: #777;

            /* 모달 관련 다크 모드 색상 */
            --modal-background-primary: var(--background_primary, #222);
            --modal-text-primary: var(--text_primary, #eee);
            --modal-border-tertiary: var(--border_tertiary, #555);
            --modal-background-secondary: var(--background_secondary, #333);
            --modal-background-quaternary: var(--background_quaternary, #444);
            --modal-accent-primary: var(--accent_primary, #6aafff);
            --modal-text-white: #fff;
        }

        /* 메인 제어판 컨테이너 스타일 */
        #chasm-like-grouper-container {
            display: flex;
            justify-content: flex-end; /* 오른쪽 정렬 */
            align-items: center;
            width: 100%;
            padding: 10px;
            box-sizing: border-box;
            gap: 10px;
            border-bottom: 1px solid var(--chasm-border-color);
            margin-bottom: 0px;
            flex-wrap: wrap; /* 작은 화면에서 요소가 줄바꿈되도록 */
        }
        #chasm-like-grouper-container label {
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--chasm-text-color);
        }
        #chasm-like-grouper-container button {
            padding: 5px 10px;
            background: var(--chasm-button-bg);
            color: var(--chasm-text-color);
            border: 1px solid var(--chasm-border-color);
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
        }
        #chasm-like-grouper-container button:hover {
            background: var(--chasm-button-hover-bg);
        }
        #chasm-like-grouper-container select {
            padding: 5px;
            border-radius: 3px;
            border: 1px solid var(--chasm-border-color);
            background-color: var(--chasm-select-bg);
            color: var(--chasm-select-text);
            cursor: pointer;
        }

        /* 좋아요 항목별 태그 UI */
        .like-item-tag-container {
            margin-top: 5px;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            align-items: center;
        }
        .like-item-tag {
            background-color: var(--chasm-tag-bg);
            color: var(--chasm-tag-text);
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .like-item-tag-remove {
            cursor: pointer;
            color: var(--chasm-tag-remove-color);
            font-weight: bold;
            margin-left: 3px;
        }
        .like-item-tag-remove:hover {
            color: #ff0000;
        }
        .add-tag-button {
            background-color: var(--chasm-add-tag-button-bg);
            color: var(--chasm-tag-text);
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-shrink: 0;
        }
        .add-tag-button:hover {
            background-color: var(--chasm-add-tag-button-hover-bg);
        }

        /* 좋아요 바로가기 버튼 스타일 (기존 내비게이션 버튼과 유사하게) */
        .chasm-custom-nav-button {
            display: flex;
            height: 40px;
            padding: 0 16px;
            align-items: center;
            justify-content: center;
            border: none;
            background: none;
            cursor: pointer;
            text-decoration: none;
            box-shadow: none;
            outline: none;
            transition: background-color 0.2s ease-in-out;
            border-radius: 5px;
        }
        .chasm-custom-nav-button p {
            font-size: 14px;
            font-weight: 500;
            color: var(--text_tertiary);
            white-space: nowrap;
            transition: color 0.2s ease-in-out;
        }
        .chasm-custom-nav-button:hover {
            background-color: var(--background_quaternary);
        }
        .chasm-custom-nav-button:hover p {
            color: var(--text_primary);
        }

        /* ========== 태그 선택 모달 스타일 ========== */
        .chasm-tag-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999; /* 다른 요소 위에 표시 */
        }

        .chasm-tag-modal-content {
            background-color: var(--modal-background-primary);
            color: var(--modal-text-primary);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto; /* 내용이 많으면 스크롤 */
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .chasm-tag-modal-content h3 {
            margin-top: 0;
            margin-bottom: 5px;
            color: var(--modal-text-primary);
        }

        .chasm-tag-modal-content p {
            margin-bottom: 10px;
            font-size: 14px;
            color: var(--modal-text-primary);
        }

        /* 태그 목록 컨테이너 */
        .chasm-tag-modal-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            max-height: 200px; /* 고정 높이, 스크롤 */
            overflow-y: auto;
            padding: 10px;
            border: 1px solid var(--modal-border-tertiary);
            border-radius: 4px;
            background-color: var(--modal-background-secondary);
        }

        /* 각 태그 버튼 */
        .chasm-tag-modal-tag-button {
            background-color: var(--modal-background-quaternary); /* 선택되지 않은 태그 배경 */
            color: var(--modal-text-primary);
            padding: 6px 12px;
            border: 1px solid var(--modal-border-tertiary);
            border-radius: 15px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
            white-space: nowrap; /* 태그가 잘리지 않도록 */
        }

        .chasm-tag-modal-tag-button.selected {
            background-color: var(--modal-accent-primary); /* 선택된 태그 배경 */
            color: var(--modal-text-white); /* 선택된 태그 텍스트 색상 */
            border-color: var(--modal-accent-primary);
        }

        .chasm-tag-modal-tag-button:hover:not(.selected) {
            background-color: var(--modal-background-tertiary);
        }

        /* 모달 하단 버튼 컨테이너 */
        .chasm-tag-modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 10px;
        }

        .chasm-tag-modal-buttons button {
            padding: 8px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s ease;
        }

        .chasm-tag-modal-buttons .confirm-button {
            background-color: var(--modal-accent-primary);
            color: var(--modal-text-white);
        }
        .chasm-tag-modal-buttons .confirm-button:hover {
            opacity: 0.9;
        }

        .chasm-tag-modal-buttons .cancel-button {
            background-color: var(--modal-background-quaternary);
            color: var(--modal-text-primary);
        }
        .chasm-tag-modal-buttons .cancel-button:hover {
            background-color: var(--modal-border-tertiary);
        }

        .chasm-tag-modal-buttons .manage-tags-button {
            background-color: var(--modal-background-secondary);
            color: var(--modal-text-primary);
            margin-right: auto; /* 왼쪽 정렬 */
            border: 1px solid var(--modal-border-tertiary);
        }
        .chasm-tag-modal-buttons .manage-tags-button:hover {
            background-color: var(--modal-background-quaternary);
        }
    `);

    // ====================================================================
    //                       핵심 로직 함수
    // ====================================================================

    let likedItemsData = {}; // 좋아요 항목별 태그 데이터
    let allAvailableTags = new Set(); // 모든 태그를 저장하는 Set (항목에 부여되지 않아도 유지)
    let currentFilterTag = 'all';

    const getLikeItemIdentifier = (itemElement) => {
        const imgElement = itemElement.querySelector('img');
        if (imgElement && imgElement.src) {
            // console.log('Identifier (Image src):', imgElement.src); // 디버깅용 로그
            return imgElement.src;
        }
        const titleElement = itemElement.querySelector("p.css-1ctc6vx");
        if (titleElement) {
            // console.log('Identifier (Title text):', titleElement.textContent.trim()); // 디버깅용 로그
            return titleElement.textContent.trim();
        }
        console.warn("경고: 좋아요 항목의 안정적인 식별자를 찾을 수 없습니다. 임시 ID를 사용합니다.", itemElement);
        const tempId = `item-${Math.random().toString(36).substr(2, 9)}`;
        // console.log('Identifier (Temporary ID):', tempId); // 디버깅용 로그
        return tempId;
    };

    const updateLikeItemTags = async (identifier, tags) => {
        // 기존에 데이터가 없었다면 새 항목을 추가
        if (!likedItemsData[identifier]) {
            // itemElement를 다시 찾아 정확한 title을 가져오도록 시도
            const itemElement = document.querySelector(`[data-item-identifier="${identifier}"]`);
            // itemElement가 있다면 해당 항목의 title을 사용하고, 없다면 identifier 자체를 title로 사용
            const title = itemElement ? itemElement.querySelector("p.css-1ctc6vx")?.textContent.trim() : identifier;
            likedItemsData[identifier] = { title: title, tags: [] };
        }
        // 태그를 업데이트 (중복 제거 및 정렬)
        likedItemsData[identifier].tags = [...new Set(tags.map(tag => tag.trim()).filter(tag => tag))].sort();

        // 현재 likedItemsData에 있는 모든 태그를 allAvailableTags에 추가 (사용자가 명시적으로 삭제하기 전까지 유지)
        likedItemsData[identifier].tags.forEach(tag => allAvailableTags.add(tag));

        // console.log('저장될 likedItemsData (Identifier: ', identifier, '):', JSON.parse(JSON.stringify(likedItemsData))); // 디버깅용 로그
        // console.log('저장될 tags:', tags); // 디버깅용 로그

        // 데이터 저장
        await setStoredData('chasmLikedItems', likedItemsData);
        await setStoredData('chasmAllTags', Array.from(allAvailableTags)); // 모든 태그 저장
        console.log('좋아요 항목 데이터 업데이트됨:', likedItemsData);
        console.log('모든 사용 가능한 태그 업데이트됨:', Array.from(allAvailableTags));


        // UI 업데이트
        const itemElement = document.querySelector(`[data-item-identifier="${identifier}"]`);
        if (itemElement) {
            renderLikeItemTags(itemElement, identifier);
        }
        updateTagFilterOptions(); // 전체 태그 목록이 업데이트될 수 있으므로 다시 호출
        filterLikes(document.getElementById("grouper-switch")?.checked || true, currentFilterTag);
    };

    const renderLikeItemTags = (itemElement, identifier) => {
        // console.log('renderLikeItemTags 호출됨 (Identifier):', identifier, itemElement); // 디버깅용 로그
        let tagContainer = itemElement.querySelector('.like-item-tag-container');
        if (!tagContainer) {
            // console.log('태그 컨테이너 없음, 새로 생성 (Identifier):', identifier); // 디버깅용 로그
            tagContainer = document.createElement('div');
            tagContainer.className = 'like-item-tag-container';
            const titleElement = itemElement.querySelector("p.css-1ctc6vx");
            if (titleElement && titleElement.parentNode) {
                // console.log('titleElement.parentNode.insertBefore 사용 (Identifier):', identifier); // 디버깅용 로그
                titleElement.parentNode.insertBefore(tagContainer, titleElement.nextSibling);
            } else {
                // console.log('itemElement.appendChild(tagContainer) 사용 (대체) (Identifier):', identifier); // 디버깅용 로그
                itemElement.appendChild(tagContainer);
            }
        }
        // console.log('태그 컨테이너 HTML 초기화 전 (Identifier):', identifier, tagContainer.innerHTML); // 디버깅용 로그
        tagContainer.innerHTML = ''; // 기존 태그들을 지우고 새로 그리기 위함
        // console.log('태그 컨테이너 HTML 초기화 후 (Identifier):', identifier, tagContainer.innerHTML); // 디버깅용 로그

        const currentTags = likedItemsData[identifier]?.tags || [];
        // console.log('현재 항목의 태그 (Identifier):', identifier, currentTags); // 디버깅용 로그

        currentTags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'like-item-tag';
            tagSpan.textContent = tag;

            const removeButton = document.createElement('span');
            removeButton.className = 'like-item-tag-remove';
            removeButton.textContent = 'x';
            removeButton.onclick = async () => {
                const newTags = currentTags.filter(t => t !== tag);
                await updateLikeItemTags(identifier, newTags);
            };
            tagSpan.appendChild(removeButton);
            tagContainer.appendChild(tagSpan);
        });

        const addTagButton = document.createElement('button');
        addTagButton.className = 'add-tag-button';
        addTagButton.textContent = '+';
        addTagButton.title = '태그 추가';
        // 이 부분에서 클릭 이벤트 버블링을 중단하여 기존 사이트의 모달이 열리지 않도록 합니다.
        addTagButton.onclick = async (event) => {
            event.stopImmediatePropagation(); // 이벤트 버블링 즉시 중단 (매우 중요)
            event.preventDefault();           // 기본 동작 방지 (혹시 모를 링크 이동 등)

            // console.log('Add Tag 버튼 클릭됨, 태그 선택 모달 띄우기 (Identifier):', identifier); // 디버깅용 로그
            showTagSelectionModal(currentTags, identifier);
        };
        tagContainer.appendChild(addTagButton);
        // console.log('renderLikeItemTags 완료, 최종 태그 컨테이너 (Identifier):', identifier, tagContainer.innerHTML); // 디버깅용 로그
    };

    /**
     * 태그 선택 모달을 표시합니다.
     * @param {Array<string>} currentLikedTags - 현재 좋아요 항목에 적용된 태그 배열.
     * @param {string} identifier - 좋아요 항목의 고유 식별자.
     */
    const showTagSelectionModal = (currentLikedTags, identifier) => {
        // 이미 모달이 열려있으면 다시 열지 않음
        if (document.getElementById('chasm-tag-selection-modal')) {
            console.log('태그 선택 모달이 이미 열려있습니다.');
            return;
        }

        // 1. 모달 배경 생성
        const modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'chasm-tag-selection-modal';
        modalBackdrop.className = 'chasm-tag-modal-backdrop';

        // 2. 모달 내용 컨테이너 생성
        const modalContent = document.createElement('div');
        modalContent.className = 'chasm-tag-modal-content';

        modalContent.innerHTML = `
            <h3>태그 선택</h3>
            <p>좋아요 항목에 추가할 태그를 선택하세요.</p>
            <div class="chasm-tag-modal-tags"></div>
            <div class="chasm-tag-modal-buttons">
                <button class="manage-tags-button">태그 관리</button>
                <button class="cancel-button">취소</button>
                <button class="confirm-button">확인</button>
            </div>
        `;

        modalBackdrop.appendChild(modalContent);
        document.body.appendChild(modalBackdrop);

        const tagsContainer = modalContent.querySelector('.chasm-tag-modal-tags');
        const selectedTags = new Set(currentLikedTags); // 현재 좋아요에 적용된 태그를 초기 선택값으로 설정

        // 모든 기존 태그 가져오기 (allAvailableTags 사용)
        const sortedExistingTags = Array.from(allAvailableTags).sort((a, b) => {
            // 현재 선택된 태그가 먼저 오도록 정렬 (선택된 태그들을 상단에 보여주는 효과)
            const aSelected = currentLikedTags.includes(a);
            const bSelected = currentLikedTags.includes(b);

            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return a.localeCompare(b); // 그 외에는 알파벳 순
        });

        // 3. 태그 버튼 동적 생성
        if (sortedExistingTags.length === 0) {
            tagsContainer.textContent = "생성된 태그가 없습니다. '태그 관리' 버튼을 이용해 먼저 태그를 만들어 주세요.";
        } else {
            sortedExistingTags.forEach(tag => {
                const tagButton = document.createElement('button');
                tagButton.className = 'chasm-tag-modal-tag-button';
                tagButton.textContent = tag;
                if (selectedTags.has(tag)) {
                    tagButton.classList.add('selected');
                }
                tagButton.addEventListener('click', () => {
                    if (selectedTags.has(tag)) {
                        selectedTags.delete(tag);
                        tagButton.classList.remove('selected');
                    } else {
                        selectedTags.add(tag);
                        tagButton.classList.add('selected');
                    }
                });
                tagsContainer.appendChild(tagButton);
            });
        }


        // 4. 이벤트 리스너 설정
        modalContent.querySelector('.cancel-button').addEventListener('click', () => {
            modalBackdrop.remove();
        });

        modalContent.querySelector('.confirm-button').addEventListener('click', async () => {
            const tagsToUpdate = Array.from(selectedTags);
            await updateLikeItemTags(identifier, tagsToUpdate);
            modalBackdrop.remove();
        });

        // '태그 관리' 버튼 클릭 이벤트 (상단 제어판 존재 여부에 따라 분기)
        modalContent.querySelector('.manage-tags-button').addEventListener('click', async () => { // async 추가
            modalBackdrop.remove(); // 태그 관리 창을 띄우기 전에 현재 모달 닫기

            const mainManageTagsButton = document.querySelector('#chasm-like-grouper-container .manage-tags-button');

            if (mainManageTagsButton) {
                // 상단 제어판의 '태그 관리' 버튼이 있다면 그걸 클릭하도록 합니다.
                mainManageTagsButton.click();
            } else {
                // 상단 제어판의 '태그 관리' 버튼을 찾을 수 없을 때 직접 prompt를 띄웁니다.
                console.warn("'태그 관리' 버튼을 찾을 수 없어 prompt 창을 직접 띄웁니다.");

                let tagsString = Array.from(allAvailableTags).sort().join(', '); // allAvailableTags 사용

                const newTagsString = prompt(
                    "전체 태그 목록을 쉼표(,)로 구분하여 입력하세요.\n(예: 태그1, 태그2, 새로운태그)\n여기에 추가하거나 삭제하면 모든 좋아요 항목의 태그에도 반영됩니다.",
                    tagsString
                );
                if (newTagsString !== null) {
                    const updatedTagsArray = newTagsString.split(',')
                                                    .map(tag => tag.trim())
                                                    .filter(tag => tag);

                    allAvailableTags = new Set(updatedTagsArray); // allAvailableTags 업데이트
                    await setStoredData('chasmAllTags', Array.from(allAvailableTags)); // 저장

                    // 삭제된 태그가 있을 경우 해당 태그를 가지고 있던 좋아요 항목에서 제거
                    for (const id in likedItemsData) {
                        const itemTags = likedItemsData[id].tags;
                        // allAvailableTags에 없는 태그는 제거
                        const filteredTags = itemTags.filter(tag => allAvailableTags.has(tag));

                        // 태그 목록에 변화가 있다면 업데이트
                        if (filteredTags.length !== itemTags.length || !filteredTags.every((val, idx) => val === itemTags[idx])) {
                            await updateLikeItemTags(id, filteredTags); // id 전달
                        }
                    }
                    updateTagFilterOptions();
                    filterLikes(document.getElementById("grouper-switch")?.checked || true, currentFilterTag);
                }
            }
        });


        // 배경 클릭 시 모달 닫기 (이벤트 버블링 방지)
        modalBackdrop.addEventListener('click', (event) => {
            if (event.target === modalBackdrop) {
                modalBackdrop.remove();
            }
        });
    };

    const addLikeShortcutButton = () => {
        const navElement = document.querySelector('nav[display="flex"][height="100%"].css-11xfrd6');
        if (!navElement) {
            // console.warn("네비게이션 메뉴를 찾을 수 없습니다. 좋아요 바로가기 버튼을 추가할 수 없습니다.");
            return;
        }

        const myCharacterLink = navElement.querySelector('a[href="/my"]');
        if (!myCharacterLink) {
            // console.warn("내 캐릭터 링크를 찾을 수 없습니다. 좋아요 바로가기 버튼을 추가할 수 없습니다.");
            return;
        }

        if (document.getElementById('like-shortcut-button')) {
            return;
        }

        const likeShortcutLink = document.createElement('a');
        likeShortcutLink.href = "https://crack.wrtn.ai/liked";
        likeShortcutLink.id = "like-shortcut-button";
        likeShortcutLink.className = "chasm-custom-nav-button";

        // 기존 사이트 버튼의 구조를 따라가기 위해 button 내부의 p 태그를 만듭니다.
        const likeButtonContent = document.createElement('button');
        likeButtonContent.style.cssText = "display:flex;height:40px;"; // 기존 버튼의 인라인 스타일
        likeButtonContent.className = "css-rvlsw9 e3j5p2p1"; // 기존 버튼의 클래스

        const likeButtonText = document.createElement('p');
        likeButtonText.style.cssText = "color:var(--text_tertiary);"; // 기존 텍스트의 인라인 스타일
        likeButtonText.className = "css-b6dcci e3j5p2p4"; // 기존 텍스트의 클래스
        likeButtonText.textContent = "좋아요";

        likeButtonContent.appendChild(likeButtonText);
        likeShortcutLink.appendChild(likeButtonContent);

        myCharacterLink.parentNode.insertBefore(likeShortcutLink, myCharacterLink.nextSibling);
        console.log("좋아요 바로가기 버튼이 추가되었습니다.");
    };

    /**
     * 메인 제어판 UI를 생성하고 페이지에 삽입합니다.
     */
    const setupControlPanel = () => {
        const existingContainer = document.getElementById("chasm-like-grouper-container");
        if (existingContainer) return;

        // '좋아요 목록' 텍스트를 포함하는 p 태그를 찾습니다.
        const targetTextElement = document.querySelector('p.css-1vhr1ma.e1h4uvut4[color="text_primary"]');

        if (!targetTextElement || !targetTextElement.parentNode) {
            console.warn("제어판을 삽입할 '좋아요 목록' 텍스트 요소를 찾을 수 없습니다.");
            return;
        }

        const container = document.createElement("div");
        container.id = "chasm-like-grouper-container";

        const toggleLabel = document.createElement("label");
        toggleLabel.textContent = "그룹핑 활성화";
        const toggleSwitch = document.createElement("input");
        toggleSwitch.type = "checkbox";
        toggleSwitch.id = "grouper-switch";
        toggleSwitch.checked = true;
        toggleSwitch.addEventListener("change", () => filterLikes(toggleSwitch.checked, currentFilterTag));
        toggleLabel.appendChild(toggleSwitch);
        container.appendChild(toggleLabel);

        const tagFilterSelect = document.createElement("select");
        tagFilterSelect.id = "tag-filter-select";
        tagFilterSelect.addEventListener("change", (e) => {
            currentFilterTag = e.target.value;
            filterLikes(toggleSwitch.checked, currentFilterTag);
        });
        container.appendChild(tagFilterSelect);

        const manageTagsButton = document.createElement("button");
        manageTagsButton.textContent = "태그 관리";
        manageTagsButton.addEventListener("click", async () => {
            let tagsString = Array.from(allAvailableTags).sort().join(', '); // allAvailableTags 사용

            const newTagsString = prompt(
                "전체 태그 목록을 쉼표(,)로 구분하여 입력하세요.\n(예: 태그1, 태그2, 새로운태그)\n여기에 추가하거나 삭제하면 모든 좋아요 항목의 태그에서도 반영됩니다.",
                tagsString
            );
            if (newTagsString !== null) {
                const updatedTagsArray = newTagsString.split(',')
                                                .map(tag => tag.trim())
                                                .filter(tag => tag);

                allAvailableTags = new Set(updatedTagsArray); // allAvailableTags 업데이트
                await setStoredData('chasmAllTags', Array.from(allAvailableTags)); // 저장

                // 삭제된 태그가 있을 경우 해당 태그를 가지고 있던 좋아요 항목에서 제거
                for (const identifier in likedItemsData) {
                    const itemTags = likedItemsData[identifier].tags;
                    // allAvailableTags에 없는 태그는 제거
                    const filteredTags = itemTags.filter(tag => allAvailableTags.has(tag));

                    // 태그 목록에 변화가 있다면 업데이트
                    if (filteredTags.length !== itemTags.length || !filteredTags.every((val, idx) => val === itemTags[idx])) {
                        await updateLikeItemTags(identifier, filteredTags);
                    }
                }
                updateTagFilterOptions();
                filterLikes(document.getElementById("grouper-switch")?.checked || true, currentFilterTag);
            }
        });
        container.appendChild(manageTagsButton);

        targetTextElement.parentNode.insertBefore(container, targetTextElement.nextSibling);
        updateTagFilterOptions();
    };

    const updateTagFilterOptions = () => {
        const selectElement = document.getElementById("tag-filter-select");
        if (!selectElement) return;

        selectElement.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = 'all';
        defaultOption.textContent = '모든 태그 보기';
        selectElement.appendChild(defaultOption);

        Array.from(allAvailableTags).sort().forEach(tag => { // allAvailableTags 사용
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            selectElement.appendChild(option);
        });

        if (selectElement.value !== currentFilterTag) {
            selectElement.value = currentFilterTag;
        }
    };

    const filterLikes = (enabled, filterTag) => {
        const likeItemElements = document.querySelectorAll("#character-liked-scroll .css-1kwvgm4 > div.css-m2oo7f");

        likeItemElements.forEach(itemElement => {
            const identifier = getLikeItemIdentifier(itemElement);
            const itemTags = likedItemsData[identifier]?.tags || [];

            if (enabled && filterTag !== 'all') {
                itemElement.style.display = itemTags.includes(filterTag) ? "" : "none";
            } else {
                itemElement.style.display = "";
            }
        });
    };

    const injectTagUIIntoLikeItems = () => {
        const likeItemElements = document.querySelectorAll("#character-liked-scroll .css-1kwvgm4 > div.css-m2oo7f");

        likeItemElements.forEach(itemElement => {
            if (itemElement.dataset.tagUiInjected) {
                return;
            }

            const identifier = getLikeItemIdentifier(itemElement);
            if (!identifier) {
                return;
            }

            itemElement.dataset.itemIdentifier = identifier;

            renderLikeItemTags(itemElement, identifier);
            itemElement.dataset.tagUiInjected = true;
        });
    };

    // ====================================================================
    //                       초기화 및 이벤트 리스너
    // ====================================================================

    const init = async () => {
        likedItemsData = await getStoredData('chasmLikedItems', {});
        allAvailableTags = new Set(await getStoredData('chasmAllTags', [])); // 모든 태그 로드
        console.log('초기 불러온 좋아요 항목 데이터:', likedItemsData);
        console.log('초기 불러온 모든 사용 가능한 태그:', Array.from(allAvailableTags));

        if (window.location.pathname === '/liked') {
            setupControlPanel();
            injectTagUIIntoLikeItems();
            filterLikes(document.getElementById("grouper-switch")?.checked || true, currentFilterTag);
        }

        addLikeShortcutButton();

        let debounceTimer;
        const observer = new MutationObserver((mutations) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                let needsFilter = false;
                let navUpdated = false;

                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        if (window.location.pathname === '/liked') {
                            injectTagUIIntoLikeItems();
                            needsFilter = true;
                        }
                        // 네비게이션 변경 감지는 조금 더 세밀하게 (헤더 또는 특정 내비게이션 영역만)
                        if (mutation.target.closest('header') || mutation.target.closest('nav.css-11xfrd6')) {
                            addLikeShortcutButton();
                            navUpdated = true;
                        }
                    }
                }

                if (needsFilter || (window.location.pathname === '/liked' && document.getElementById("grouper-switch")?.checked)) {
                    filterLikes(document.getElementById("grouper-switch")?.checked || true, currentFilterTag);
                }
                // 좋아요 페이지가 아닌 다른 페이지에서 내비게이션이 업데이트되지 않았는데 버튼이 없으면 추가 시도
                if (!navUpdated && !document.getElementById('like-shortcut-button') && window.location.pathname !== '/liked') {
                    addLikeShortcutButton();
                }

            }, 100); // 100ms 지연
        });

        // body의 모든 하위 요소 변화를 감지합니다.
        observer.observe(document.body, { childList: true, subtree: true });

        // 페이지 로드 시 및 일정 시간 후에도 UI를 초기화합니다.
        window.addEventListener('load', () => {
            if (window.location.pathname === '/liked') {
                setupControlPanel();
                injectTagUIIntoLikeItems();
                filterLikes(document.getElementById("grouper-switch")?.checked || true, currentFilterTag);
            }
            addLikeShortcutButton();
        });

        // 초기 로딩 후 UI가 완전히 안정화될 시간을 줍니다.
        setTimeout(() => {
            if (window.location.pathname === '/liked') {
                setupControlPanel();
                injectTagUIIntoLikeItems();
                filterLikes(document.getElementById("grouper-switch")?.checked || true, currentFilterTag);
            }
            addLikeShortcutButton();
        }, 1500); // 1.5초 지연
    };

    init();

})();
