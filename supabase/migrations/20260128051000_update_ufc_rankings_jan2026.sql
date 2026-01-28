-- Update UFC Rankings to January 27, 2026
-- Source: ESPN MMA Divisional Rankings (Jan 27, 2026)
-- https://www.espn.com/mma/story/_/id/21807736/mma-divisional-rankings-ufc-bellator-pfl-rankings-weight-class
-- PFL cross-promotional fighters excluded (UFC fighters only)

-- Step 0: Add interim champion support
ALTER TABLE ufc_fighters ADD COLUMN IF NOT EXISTS is_interim_champion boolean DEFAULT false;

-- Step 1: Clear all existing rankings and interim flags
UPDATE ufc_fighters SET ranking = NULL, is_interim_champion = false WHERE ranking IS NOT NULL OR is_interim_champion = true;

-- ============================================================================
-- HEAVYWEIGHT (Champion: Tom Aspinall)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Tom Aspinall%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Ciryl Gane%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Curtis Blaydes%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Alexander Volkov%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Sergei Pavlovich%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Waldo Cortes%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Jailton Almeida%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Serghei Spivac%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Heavyweight'
WHERE full_name ILIKE '%Derrick Lewis%';

-- ============================================================================
-- LIGHT HEAVYWEIGHT (Champion: Alex Pereira)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Alex Pereira%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Magomed Ankalaev%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Jiri Prochazka%' OR full_name ILIKE '%Jiří Procházka%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Carlos Ulberg%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Khalil Rountree%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Azamat Murzakanov%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Dominick Reyes%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Aleksandar Rakic%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Light Heavyweight'
WHERE full_name ILIKE '%Jamahal Hill%';

-- ============================================================================
-- MIDDLEWEIGHT (Champion: Khamzat Chimaev)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Khamzat Chimaev%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Dricus du Plessis%' OR full_name ILIKE '%Dricus Du Plessis%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Nassourdine Imavov%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Sean Strickland%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Israel Adesanya%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Anthony Hernandez%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Caio Borralho%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Brendan Allen%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Reinier de Ridder%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Middleweight'
WHERE full_name ILIKE '%Robert Whittaker%';

-- ============================================================================
-- WELTERWEIGHT (Champion: Islam Makhachev)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Islam Makhachev%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Jack Della Maddalena%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Ian Machado Garry%' OR full_name ILIKE '%Ian Garry%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Michael Morales%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Belal Muhammad%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Kamaru Usman%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Sean Brady%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Carlos Prates%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Joaquin Buckley%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Welterweight'
WHERE full_name ILIKE '%Gabriel Bonfim%';

-- ============================================================================
-- LIGHTWEIGHT (Champion: Ilia Topuria, Interim: Justin Gaethje)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Ilia Topuria%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Arman Tsarukyan%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Charles Oliveira%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Max Holloway%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Lightweight', is_interim_champion = true
WHERE full_name ILIKE '%Justin Gaethje%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Paddy Pimblett%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Mateusz Gamrot%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Rafael Fiziev%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Lightweight'
WHERE full_name ILIKE '%Benoit Saint Denis%' OR full_name ILIKE '%Benoît Saint Denis%';

-- ============================================================================
-- FEATHERWEIGHT (Champion: Alexander Volkanovski)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Alexander Volkanovski%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Diego Lopes%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Yair Rodriguez%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Lerone Murphy%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Aljamain Sterling%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Youssef Zalal%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Brian Ortega%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Josh Emmett%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Featherweight'
WHERE full_name ILIKE '%Steve Garcia%';

-- ============================================================================
-- BANTAMWEIGHT (Champion: Petr Yan)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Petr Yan%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Merab Dvalishvili%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Bantamweight'
WHERE full_name ILIKE 'Sean O''Malley' OR full_name ILIKE '%Sean O''Malley%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Umar Nurmagomedov%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Cory Sandhagen%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Mario Bautista%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Song Yadong%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Deiveson Figueiredo%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Marlon Vera%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Bantamweight'
WHERE full_name ILIKE '%Aiemann Zahabi%';

-- ============================================================================
-- FLYWEIGHT (Champion: Joshua Van)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Joshua Van%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Alexandre Pantoja%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Tatsuro Taira%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Manel Kape%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Brandon Royval%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Brandon Moreno%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Kai Kara-France%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Muhammad Mokaev%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Steve Erceg%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Flyweight'
WHERE full_name ILIKE '%Kai Asakura%';

-- ============================================================================
-- WOMEN'S STRAWWEIGHT (Champion: Mackenzie Dern — new champion)
-- Zhang Weili vacated to move to flyweight
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Mackenzie Dern%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Zhang Weili%' OR full_name ILIKE '%Weili Zhang%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Tatiana Suarez%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Yan Xiaonan%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Amanda Lemos%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Virna Jandiroba%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Jessica Andrade%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Marina Rodriguez%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Angela Hill%';

UPDATE ufc_fighters SET ranking = 9, weight_class = 'Strawweight'
WHERE full_name ILIKE '%Tabatha Ricci%';

-- ============================================================================
-- WOMEN'S BANTAMWEIGHT (Champion: Kayla Harrison — new division)
-- ============================================================================
UPDATE ufc_fighters SET ranking = 0, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Kayla Harrison%';

UPDATE ufc_fighters SET ranking = 1, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Julianna Pena%' OR full_name ILIKE '%Julianna Peña%';

UPDATE ufc_fighters SET ranking = 2, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Norma Dumont%';

UPDATE ufc_fighters SET ranking = 3, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Ketlen Vieira%';

UPDATE ufc_fighters SET ranking = 4, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Yana Santos%';

UPDATE ufc_fighters SET ranking = 5, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Macy Chiasson%';

UPDATE ufc_fighters SET ranking = 6, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Ailin Perez%';

UPDATE ufc_fighters SET ranking = 7, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Karol Rosa%';

UPDATE ufc_fighters SET ranking = 8, weight_class = 'Women''s Bantamweight'
WHERE full_name ILIKE '%Jacqueline Cavalcanti%';
