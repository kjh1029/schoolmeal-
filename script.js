
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('meal-date');
    const searchBtn = document.getElementById('search-btn');
    const loading = document.getElementById('loading');
    const mealInfo = document.getElementById('meal-info');
    const mealDateDisplay = document.getElementById('meal-date-display');
    const mealContent = document.getElementById('meal-content');
    const errorMessage = document.getElementById('error-message');
    const totalCalories = document.getElementById('total-calories');
    const allergyCount = document.getElementById('allergy-count');
    const allergyCheckboxes = document.querySelectorAll('.allergy-checkbox input[type="checkbox"]');

    // 오늘 날짜를 기본값으로 설정
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
    dateInput.value = todayString;

    searchBtn.addEventListener('click', function() {
        const selectedDate = dateInput.value;
        if (!selectedDate) {
            alert('날짜를 선택해주세요.');
            return;
        }
        
        fetchMealInfo(selectedDate);
    });

    dateInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // 영양성분 데이터베이스 (대략적인 값들)
    const nutritionDB = {
        '밥': { calories: 150, carbs: 35, protein: 3, fat: 0.3, allergies: [] },
        '현미밥': { calories: 140, carbs: 32, protein: 3.5, fat: 1, allergies: [] },
        '잡곡밥': { calories: 145, carbs: 33, protein: 4, fat: 0.8, allergies: [] },
        '김치찌개': { calories: 120, carbs: 8, protein: 10, fat: 6, allergies: [] },
        '된장찌개': { calories: 110, carbs: 10, protein: 8, fat: 5, allergies: ['대두'] },
        '미역국': { calories: 45, carbs: 6, protein: 3, fat: 1, allergies: [] },
        '소고기': { calories: 200, carbs: 0, protein: 26, fat: 10, allergies: ['소고기'] },
        '돼지고기': { calories: 180, carbs: 0, protein: 25, fat: 8, allergies: ['돼지고기'] },
        '닭고기': { calories: 160, carbs: 0, protein: 30, fat: 3.5, allergies: ['닭고기'] },
        '생선': { calories: 140, carbs: 0, protein: 28, fat: 3, allergies: ['고등어'] },
        '두부': { calories: 80, carbs: 2, protein: 8, fat: 5, allergies: ['대두'] },
        '계란': { calories: 70, carbs: 1, protein: 6, fat: 5, allergies: ['난류'] },
        '계란말이': { calories: 120, carbs: 2, protein: 10, fat: 8, allergies: ['난류'] },
        '오징어': { calories: 85, carbs: 3, protein: 18, fat: 1, allergies: ['오징어'] },
        '새우': { calories: 85, carbs: 0, protein: 20, fat: 1, allergies: ['새우'] },
        '조개': { calories: 75, carbs: 4, protein: 15, fat: 1, allergies: ['조개류'] },
        '우유': { calories: 60, carbs: 5, protein: 3, fat: 3.2, allergies: ['우유'] },
        '치즈': { calories: 110, carbs: 1, protein: 7, fat: 9, allergies: ['우유'] },
        '빵': { calories: 250, carbs: 50, protein: 8, fat: 3, allergies: ['밀', '난류'] },
        '면': { calories: 220, carbs: 45, protein: 7, fat: 1, allergies: ['밀'] },
        '라면': { calories: 380, carbs: 55, protein: 10, fat: 15, allergies: ['밀', '대두'] },
        '만두': { calories: 200, carbs: 25, protein: 8, fat: 8, allergies: ['밀', '대두', '돼지고기'] },
        '튀김': { calories: 250, carbs: 20, protein: 12, fat: 15, allergies: ['밀'] },
        '호두': { calories: 180, carbs: 4, protein: 4, fat: 18, allergies: ['호두'] },
        '토마토': { calories: 18, carbs: 4, protein: 1, fat: 0, allergies: ['토마토'] },
        '복숭아': { calories: 40, carbs: 10, protein: 1, fat: 0, allergies: ['복숭아'] }
    };

    // 알레르기 정보 매핑
    const allergyMap = {
        '1': '난류', '2': '우유', '3': '메밀', '4': '밀', '5': '대두',
        '6': '돼지고기', '7': '복숭아', '8': '토마토', '9': '아황산류',
        '10': '호두', '12': '새우', '13': '고등어', '14': '오징어',
        '15': '조개류', '16': '닭고기', '17': '소고기'
    };

    async function fetchMealInfo(date) {
        showLoading();
        
        try {
            const formattedDate = date.replace(/-/g, '');
            const apiUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530183&MLSV_YMD=${formattedDate}`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
            
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error('네트워크 응답이 올바르지 않습니다.');
            }
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
            
            const errorCode = xmlDoc.querySelector('RESULT CODE');
            if (errorCode && errorCode.textContent !== 'INFO-000') {
                throw new Error('급식 정보를 찾을 수 없습니다.');
            }
            
            const mealRows = xmlDoc.querySelectorAll('row');
            
            if (mealRows.length === 0) {
                showNoData(date);
                return;
            }
            
            displayMealInfo(mealRows, date);
            
        } catch (error) {
            console.error('Error fetching meal info:', error);
            showError();
        }
    }

    function analyzeNutrition(menuItems) {
        let totalNutrition = { calories: 0, carbs: 0, protein: 0, fat: 0 };
        let foundAllergies = new Set();
        
        menuItems.forEach(item => {
            const cleanItem = item.toLowerCase().trim();
            
            // 키워드 매칭으로 영양성분 추정
            for (const [food, nutrition] of Object.entries(nutritionDB)) {
                if (cleanItem.includes(food)) {
                    totalNutrition.calories += nutrition.calories;
                    totalNutrition.carbs += nutrition.carbs;
                    totalNutrition.protein += nutrition.protein;
                    totalNutrition.fat += nutrition.fat;
                    
                    // 알레르기 정보 추가
                    nutrition.allergies.forEach(allergy => {
                        foundAllergies.add(allergy);
                    });
                    break;
                }
            }
        });
        
        // 기본 칼로리 (매칭되지 않는 음식들을 위한 추정값)
        const unmatchedItems = menuItems.length;
        totalNutrition.calories += unmatchedItems * 50; // 평균 추정값
        totalNutrition.carbs += unmatchedItems * 8;
        totalNutrition.protein += unmatchedItems * 3;
        totalNutrition.fat += unmatchedItems * 2;
        
        return { nutrition: totalNutrition, allergies: Array.from(foundAllergies) };
    }

    function extractAllergiesFromText(dishNames) {
        const allergies = new Set();
        const allergyPattern = /\(([^)]*)\)/g;
        let match;
        
        while ((match = allergyPattern.exec(dishNames)) !== null) {
            const allergyNumbers = match[1].split(',').map(num => num.trim());
            allergyNumbers.forEach(num => {
                if (allergyMap[num]) {
                    allergies.add(allergyMap[num]);
                }
            });
        }
        
        return Array.from(allergies);
    }

    function getUserSelectedAllergies() {
        const selected = [];
        allergyCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selected.push(checkbox.value);
            }
        });
        return selected;
    }

    function hasAllergyConflict(menuAllergies, userAllergies) {
        return userAllergies.some(allergy => menuAllergies.includes(allergy));
    }

    function displayMealInfo(mealRows, date) {
        hideAll();
        
        const displayDate = formatDisplayDate(date);
        mealDateDisplay.textContent = `${displayDate} 급식 정보`;
        
        let mealHtml = '';
        let allMenuItems = [];
        let totalAllergies = new Set();
        const userSelectedAllergies = getUserSelectedAllergies();
        let hasUserAllergyConflict = false;
        
        const mealTypes = {
            '1': { name: '조식', icon: 'fa-sun' },
            '2': { name: '중식', icon: 'fa-utensils' }, 
            '3': { name: '석식', icon: 'fa-moon' }
        };
        
        Array.from(mealRows).forEach(row => {
            const mealTypeCode = row.querySelector('MMEAL_SC_CODE')?.textContent;
            const mealTypeInfo = mealTypes[mealTypeCode] || { name: '급식', icon: 'fa-utensils' };
            const dishNames = row.querySelector('DDISH_NM')?.textContent;
            const calorieInfo = row.querySelector('CAL_INFO')?.textContent;
            
            if (dishNames) {
                const menuItems = dishNames
                    .replace(/\([^)]*\)/g, '')
                    .replace(/\d+\./g, '')
                    .split('<br/>')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
                
                allMenuItems = allMenuItems.concat(menuItems);
                
                const analysisResult = analyzeNutrition(menuItems);
                const apiAllergies = extractAllergiesFromText(dishNames);
                const combinedAllergies = [...new Set([...analysisResult.allergies, ...apiAllergies])];
                
                combinedAllergies.forEach(allergy => totalAllergies.add(allergy));
                
                const mealHasConflict = hasAllergyConflict(combinedAllergies, userSelectedAllergies);
                if (mealHasConflict) hasUserAllergyConflict = true;
                
                const menuHtml = menuItems.map(item => {
                    const itemAnalysis = analyzeNutrition([item]);
                    const itemHasConflict = hasAllergyConflict([...itemAnalysis.allergies, ...apiAllergies], userSelectedAllergies);
                    return `<div class="meal-menu-item ${itemHasConflict ? 'allergy-warning' : ''}">
                        ${item}
                        ${itemHasConflict ? '<i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>' : ''}
                    </div>`;
                }).join('');
                
                const allergyTagsHtml = combinedAllergies.map(allergy => {
                    const isMatched = userSelectedAllergies.includes(allergy);
                    return `<span class="allergy-tag ${isMatched ? 'matched' : ''}">${allergy}</span>`;
                }).join('');
                
                mealHtml += `
                    <div class="meal-type ${mealHasConflict ? 'has-allergy-warning' : ''}">
                        <div class="meal-type-header ${mealHasConflict ? 'has-allergy' : ''}">
                            <i class="fas ${mealTypeInfo.icon}"></i>
                            <h3>${mealTypeInfo.name}</h3>
                            ${mealHasConflict ? '<i class="fas fa-exclamation-triangle" style="margin-left: auto;"></i>' : ''}
                            ${calorieInfo ? `<span style="margin-left: auto; font-size: 0.9em;">${calorieInfo}</span>` : ''}
                        </div>
                        <div class="meal-content-wrapper">
                            <div class="meal-menu">${menuHtml}</div>
                            
                            ${combinedAllergies.length > 0 ? `
                            <div class="allergy-info">
                                <div class="allergy-title">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>알레르기 정보</span>
                                </div>
                                <div class="allergy-tags">${allergyTagsHtml}</div>
                            </div>
                            ` : ''}
                            
                            <div class="nutrition-info">
                                <div class="nutrition-title">
                                    <i class="fas fa-chart-pie"></i>
                                    <span>예상 영양성분</span>
                                </div>
                                <div class="nutrition-grid">
                                    <div class="nutrition-item">
                                        <div class="nutrition-label">칼로리</div>
                                        <div class="nutrition-value">${Math.round(analysisResult.nutrition.calories)}<span class="nutrition-unit">kcal</span></div>
                                    </div>
                                    <div class="nutrition-item">
                                        <div class="nutrition-label">탄수화물</div>
                                        <div class="nutrition-value">${Math.round(analysisResult.nutrition.carbs)}<span class="nutrition-unit">g</span></div>
                                    </div>
                                    <div class="nutrition-item">
                                        <div class="nutrition-label">단백질</div>
                                        <div class="nutrition-value">${Math.round(analysisResult.nutrition.protein)}<span class="nutrition-unit">g</span></div>
                                    </div>
                                    <div class="nutrition-item">
                                        <div class="nutrition-label">지방</div>
                                        <div class="nutrition-value">${Math.round(analysisResult.nutrition.fat)}<span class="nutrition-unit">g</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        if (mealHtml === '') {
            showNoData(date);
            return;
        }
        
        // 총 칼로리 계산
        const totalNutritionResult = analyzeNutrition(allMenuItems);
        totalCalories.textContent = `${Math.round(totalNutritionResult.nutrition.calories)} kcal`;
        
        // 알레르기 정보 표시
        if (hasUserAllergyConflict) {
            allergyCount.textContent = '주의 필요';
            allergyCount.style.color = '#f44336';
        } else {
            allergyCount.textContent = `${totalAllergies.size}개 항목`;
            allergyCount.style.color = 'white';
        }
        
        mealContent.innerHTML = mealHtml;
        mealInfo.classList.remove('hidden');
    }

    function showNoData(date) {
        hideAll();
        const displayDate = formatDisplayDate(date);
        mealDateDisplay.textContent = `${displayDate} 급식 정보`;
        totalCalories.textContent = '-';
        allergyCount.textContent = '-';
        mealContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-info-circle" style="font-size: 3em; color: #ccc; margin-bottom: 15px;"></i>
                <p style="color: #666; font-size: 1.1em;">해당 날짜에 급식 정보가 없습니다.</p>
            </div>
        `;
        mealInfo.classList.remove('hidden');
    }

    function showLoading() {
        hideAll();
        loading.classList.remove('hidden');
    }

    function showError() {
        hideAll();
        errorMessage.classList.remove('hidden');
    }

    function hideAll() {
        loading.classList.add('hidden');
        mealInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');
    }

    function formatDisplayDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = dayNames[date.getDay()];
        
        return `${year}년 ${month}월 ${day}일 (${dayName})`;
    }

    // 알레르기 필터 변경 시 실시간 업데이트
    allergyCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (mealInfo && !mealInfo.classList.contains('hidden')) {
                // 현재 표시된 급식 정보가 있으면 다시 렌더링
                const currentDate = dateInput.value;
                if (currentDate) {
                    fetchMealInfo(currentDate);
                }
            }
        });
    });
});
